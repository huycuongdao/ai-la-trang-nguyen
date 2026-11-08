// Elimination mode rules: npx tsx src/game/engine/elimination.test.ts   (add --update to rewrite the golden fixture)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOAI, nhomCau } from '../elimination-config';
import { Driver, ELIM_START, runElimScenario, testBank } from './elimination-golden';
import { LoaiTru, lenhThamGia } from './elimination';

const withLoai = <T,>(patch: Partial<typeof LOAI>, run: () => T): T => {
  const old = { ...LOAI };
  Object.assign(LOAI, patch);
  try {
    return run();
  } finally {
    Object.assign(LOAI, old);
  }
};
const alive = (d: Driver) => [...d.k.nguoi.values()].filter((p) => p.alive).map((p) => p.id).sort();

// ---- difficulty ramp ----
assert.equal(nhomCau(1), 'de');
assert.equal(nhomCau(5), 'de');
assert.equal(nhomCau(6), 'vua');
assert.equal(nhomCau(11), 'kho');
assert.equal(nhomCau(16), 'dinh');
assert.equal(nhomCau(17), 'meo');
assert.equal(nhomCau(18), 'dinh');

// ---- join words ----
assert.equal(lenhThamGia('Tham gia'), true);
assert.equal(lenhThamGia('vào chơi'), true);
assert.equal(lenhThamGia('xin chào'), false);

// ---- lobby: A-D or "tham gia" register, others do not; the cap is respected ----
{
  const d = new Driver();
  d.k.datMaxNguoi(3);
  assert.equal(d.k.chat({ id: 'a', name: 'A', avatar: '', comment: 'xin chào' }, d.t), false);
  assert.equal(d.k.chat({ id: 'a', name: 'A', avatar: '', comment: 'c' }, d.t), true);
  assert.equal(d.join('b'), true);
  assert.equal(d.join('c'), true);
  assert.equal(d.join('d'), false); // room is full
  assert.equal(d.k.view(d.t).soNguoi, 3);
  assert.equal(d.k.chat({ id: 'x', name: 'X', avatar: '', comment: '7' }, d.t), false); // vote digits mean nothing in the lobby
}

// ---- lobby: too few players at the end of the countdown -> wait, then start once enough ----
{
  const d = new Driver();
  d.join('a');
  d.step(LOAI.choSec * 1000);
  assert.equal(d.k.phase, 'cho');
  assert.ok(d.events().some((e) => e.t === 'chuaDu'));
  d.join('b');
  d.step(LOAI.choThemSec * 1000);
  assert.equal(d.k.phase, 'doc');
  assert.ok(d.events().some((e) => e.t === 'batDau'));
}

// ---- the answer window: not before the answers show; first answer only; wrong or missing = out ----
{
  const d = new Driver();
  ['a', 'b', 'c', 'd'].forEach((id) => d.join(id));
  d.until('doc');
  assert.equal(d.answer('a', true), false); // answers not shown yet: not counted, not a lost turn
  d.until('hoi');
  d.step(1000);
  assert.equal(d.answer('a', true), true);
  assert.equal(d.answer('a', false), false); // first answer only
  assert.equal(d.answer('b', true), true);
  assert.equal(d.answer('c', false), true);
  // d never answers
  d.until('dapAn');
  assert.deepEqual(alive(d), ['a', 'b']);
  const v = d.k.view(d.t);
  assert.equal(v.ghe.length, 4); // the two who just left are still drawn (so they can fade out)
  assert.deepEqual(v.ghe.filter((g) => !g.alive).map((g) => g.id).sort(), ['c', 'd']);
  assert.equal(v.ketQua?.soDung, 2);
  assert.equal(v.conLai, 2);
  const ev = d.events().find((e) => e.t === 'dapAn');
  assert.ok(ev && ev.t === 'dapAn' && ev.loai === 2 && ev.conLai === 2 && !ev.khongAiDung);
  // eliminated players are ignored afterwards
  d.afterReveal();
  assert.equal(d.k.view(d.t).ghe.length, 2);
  d.until('hoi');
  assert.equal(d.answer('c', true), false);
}

// ---- nobody correct: nobody is eliminated ----
{
  const d = new Driver();
  ['a', 'b', 'c'].forEach((id) => d.join(id));
  d.until('hoi');
  d.step(500);
  d.answer('a', false);
  d.answer('b', false);
  d.until('dapAn');
  assert.deepEqual(alive(d), ['a', 'b', 'c']);
  assert.equal(d.k.view(d.t).khongAiDung, true);
  const ev = d.events().find((e) => e.t === 'dapAn');
  assert.ok(ev && ev.t === 'dapAn' && ev.khongAiDung && ev.loai === 0);
  d.afterReveal();
  assert.equal(d.k.phase, 'doc'); // carries on with the next question
  assert.equal(d.k.cauSo, 2);
}

// ---- late join: a newcomer who answers right stays; one who answers wrong is out ----
{
  const d = new Driver();
  ['a', 'b'].forEach((id) => d.join(id));
  d.until('hoi');
  d.step(500);
  d.answer('a', true);
  d.answer('b', true);
  assert.equal(d.answer('late1', true), true);
  assert.equal(d.answer('late2', false), true);
  d.until('dapAn');
  assert.deepEqual(alive(d), ['a', 'b', 'late1']);
  // the cap still holds mid-game
  withLoai({ chamNhapSauCau: 1 }, () => {
    d.afterReveal();
    d.until('hoi');
    assert.equal(d.answer('late3', true), false); // joining is closed after question 1
  });
}

// ---- last one standing wins; the winner screen carries the average time ----
{
  const d = new Driver();
  ['a', 'b'].forEach((id) => d.join(id));
  d.until('hoi');
  d.step(1000);
  d.answer('a', true);
  d.step(500);
  d.answer('b', false);
  d.until('dapAn');
  d.afterReveal();
  assert.equal(d.k.phase, 'vinhDanh');
  const v = d.k.view(d.t);
  assert.equal(v.thang?.id, 'a');
  assert.equal(v.thang?.avgMs, 1000);
  const ev = d.events().find((e) => e.t === 'vinhDanh');
  assert.ok(ev && ev.t === 'vinhDanh' && ev.id === 'a' && ev.soNguoi === 2);
}

// ---- question cap: the best average time wins; near-equal times are decided by the votes ----
withLoai({ maxCau: 2 }, () => {
  const d = new Driver();
  ['a', 'b', 'c'].forEach((id) => d.join(id));
  d.until('hoi');
  // top board is open from the start (3 <= topN): numbers are fixed by the first order
  assert.equal(d.k.view(d.t).binhChon, true);
  const so = Object.fromEntries(d.k.view(d.t).top.map((t) => [t.id, t.so]));
  d.step(1000);
  d.answer('a', true);
  d.step(100);
  d.answer('b', true); // 100 ms behind a: within the tie window
  d.step(2000);
  d.answer('c', true); // clearly slower
  // votes: viewer types b's number, then sends a rose (counts) and an unknown gift (does not)
  d.k.chat({ id: 'fan', name: 'Fan', avatar: '', comment: String(so.b) }, d.t);
  assert.equal(d.k.tangQua({ id: 'fan', name: 'Fan', avatar: '', gift: 'Rose', count: 2, coins: 2, big: false }, d.t), true);
  assert.equal(d.k.tangQua({ id: 'fan', name: 'Fan', avatar: '', gift: 'Lion', count: 1, coins: 29999, big: true }, d.t), false);
  assert.equal(d.k.tangQua({ id: 'nobody', name: 'N', avatar: '', gift: 'Rose', count: 1, coins: 1, big: false }, d.t), false); // no pick yet
  d.until('dapAn');
  d.afterReveal();
  d.until('hoi');
  d.step(1000);
  ['a', 'b', 'c'].forEach((id) => d.answer(id, true));
  d.until('dapAn');
  d.afterReveal();
  assert.equal(d.k.phase, 'vinhDanh');
  assert.equal(d.k.view(d.t).thang?.id, 'b'); // b was within 300 ms of a and has the votes
  assert.equal(d.k.view(d.t).yeuNhat?.id, 'b');
});

withLoai({ maxCau: 1, veVote: false }, () => {
  const d = new Driver();
  ['a', 'b'].forEach((id) => d.join(id));
  d.until('hoi');
  d.step(1000);
  d.answer('b', true);
  d.step(100);
  d.answer('a', true);
  d.until('dapAn');
  d.afterReveal();
  assert.equal(d.k.view(d.t).thang?.id, 'b'); // without votes the fastest wins
});

// ---- the top board opens once, with fixed numbers, when 5 or fewer are left ----
{
  const d = new Driver();
  const ids = Array.from({ length: 7 }, (_, i) => `p${i + 1}`);
  ids.forEach((id) => d.join(id));
  d.until('hoi');
  assert.equal(d.k.view(d.t).top.length, 0);
  d.step(500);
  ids.forEach((id, i) => d.answer(id, i < 4)); // 4 stay
  d.until('dapAn');
  d.afterReveal();
  d.until('hoi');
  const top = d.k.view(d.t).top;
  assert.equal(top.length, 4);
  assert.deepEqual(top.map((t) => t.so).sort(), [1, 2, 3, 4]);
  assert.ok(d.events().some((e) => e.t === 'topNam'));
}

// ---- after the winner: wait for hearts (or the fallback) before the lobby counts down ----
{
  const d = new Driver();
  ['a', 'b'].forEach((id) => d.join(id));
  d.until('hoi');
  d.step(500);
  d.answer('a', true);
  d.answer('b', false);
  d.until('dapAn');
  d.afterReveal();
  assert.equal(d.k.phase, 'vinhDanh');
  d.step(LOAI.vinhDanhSec * 1000);
  assert.equal(d.k.phase, 'cho');
  assert.equal(d.k.view(d.t).cong?.can, LOAI.timTiepTuc);
  assert.equal(d.k.view(d.t).soNguoi, 0); // new game, empty lobby
  assert.equal(d.join('c'), true); // people can register while hearts pile up
  d.k.tim(LOAI.timTiepTuc - 1);
  d.step(1000);
  assert.ok(d.k.view(d.t).cong); // not enough yet
  d.k.tim(1);
  d.step(250);
  assert.equal(d.k.view(d.t).cong, null);
  assert.ok(d.events().some((e) => e.t === 'moDangKy'));
  assert.equal(d.k.view(d.t).con, LOAI.choSec); // registration countdown started
}
{
  const d = new Driver();
  d.k.cho(d.t, true);
  d.step(LOAI.choToiDaSec * 1000);
  assert.equal(d.k.view(d.t).cong, null); // fallback: opens without hearts
  assert.ok(d.events().some((e) => e.t === 'moDangKy'));
}

// ---- skipping a bad question asks another one and eliminates nobody ----
{
  const d = new Driver();
  ['a', 'b'].forEach((id) => d.join(id));
  d.until('hoi');
  const first = d.k.view(d.t).q;
  d.answer('a', false);
  d.k.boCau(d.t);
  assert.equal(d.k.phase, 'doc');
  assert.notEqual(d.k.view(d.t).q, first);
  assert.equal(d.k.cauSo, 1);
  assert.deepEqual(alive(d), ['a', 'b']);
}

// ---- save and restore: same picture, same game afterwards ----
{
  const a = new Driver();
  ['a', 'b', 'c'].forEach((id) => a.join(id));
  a.until('hoi');
  a.step(700);
  a.answer('a', true);
  a.answer('c', false);
  const snap = a.k.snapshot(a.t);
  const b = new LoaiTru(testBank(), {}, () => 0.5);
  assert.equal(b.restore(snap), true);
  assert.deepEqual(JSON.parse(JSON.stringify(b.view(a.t))), JSON.parse(JSON.stringify(a.k.view(a.t))));
  assert.equal(b.restore({ version: 1, savedAt: 0 }), false); // not an elimination snapshot
  assert.equal(new LoaiTru([], {}, () => 0.5).restore(snap), false); // the bank no longer has the question
  let t = a.t;
  for (const k of [a.k, b]) {
    t = a.t;
    for (let i = 0; i < 40 && k.phase === 'hoi'; i++) k.tick((t += 250));
  }
  assert.equal(b.phase, a.k.phase);
  assert.deepEqual([...b.nguoi.keys()].filter((id) => b.nguoi.get(id)!.alive), [...a.k.nguoi.keys()].filter((id) => a.k.nguoi.get(id)!.alive));
}

// ---- golden run ----
{
  const fixtureUrl = new URL('./fixtures/elimination-golden.json', import.meta.url);
  const fresh = JSON.parse(JSON.stringify(runElimScenario()));
  assert.deepEqual(JSON.parse(JSON.stringify(runElimScenario())), fresh, 'elimination golden run is not deterministic');
  if (process.argv.includes('--update')) {
    fs.writeFileSync(fixtureUrl, JSON.stringify(fresh, null, 2) + '\n');
    console.log('elimination golden run: fixture written');
  } else {
    assert.deepEqual(fresh, JSON.parse(fs.readFileSync(fixtureUrl, 'utf8')));
  }
}
void ELIM_START;
console.log('elimination: OK');
