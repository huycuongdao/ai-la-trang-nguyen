// Golden run: a seeded, scripted game must always give the same transitions, events and ranking.
// Run: npx tsx src/game/golden-run.test.ts   (add --update to rewrite the fixture)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME } from './config';
import { KyThi, parseMc, type Ev } from './exam';

const dir = new URL('./questions/', import.meta.url);
const fixtureUrl = new URL('./fixtures/golden-run.json', import.meta.url);

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function run() {
  // Fixed file order (the order the files had when the fixture was recorded), so renames never change the bank order
  const files = [
    'geography-vn', 'final-exam-scholars', 'final-mixed', 'animals-plants', 'natural-science', 'history-vn-modern',
    'history-vn-ancient-medieval', 'riddles-wordplay-folk', 'riddles-logic-situations', 'inventions-arts-sports',
    'biology-health', 'world', 'culture-food-vn', 'literature-vietnamese',
  ].map((f) => `${f}.txt`);
  assert.deepEqual([...files].sort(), fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort(), 'question file list changed');
  const bank = files.flatMap((f) => parseMc(fs.readFileSync(new URL(f, dir), 'utf8')));
  const k = new KyThi(bank, {}, mulberry32(20261108));
  let t = 1_700_000_000_000;

  const users = ['an', 'binh', 'chi', 'dung', 'em', 'phuc', 'giang', 'hoa', 'tie1', 'tie2'].map((id) => ({
    id, name: id.toUpperCase(), avatar: `${id}.png`,
  }));
  const transitions: string[] = [];
  const events: Ev[] = [];
  const giftsAt = new Set([40, 90, 91, 200]);
  let lastKey = '';
  let boDone = false;
  let answered = new Set<string>();
  let tick = 0;

  k.cho(t);
  // one chat line before the round: region and gender picks are remembered
  k.chat({ ...users[0], comment: 'miền Bắc' }, t);
  k.chat({ ...users[1], comment: 'nam bộ' }, t);
  k.chat({ ...users[2], comment: 'trung' }, t);
  k.chat({ ...users[2], comment: 'nữ' }, t);
  k.chat({ ...users[3], comment: 'con trai' }, t);

  for (let guard = 0; guard < 20000; guard++) {
    t += 500;
    tick++;
    if (giftsAt.has(tick)) {
      const u = users[tick % users.length];
      k.tangQua({ id: u.id, name: u.name, avatar: u.avatar, gift: 'Rose', count: 1, coins: tick === 200 ? 199 : 1, big: tick === 200 }, t);
    }
    if (k.phase === 'doc') {
      // fake voice finishes reading 2 s after the question opens
      if (t >= k.endsAt - (GAME.docMaxSec - 2) * 1000) k.docXong(t);
    }
    if (k.phase === 'hoi') {
      const q = k.cauSo;
      const total = GAME.vong[k.cau!.vong].giay * 1000;
      const shown = k.endsAt - total;
      const off = t - shown;
      if (q === 7 && !boDone && off >= 3000) {
        boDone = true;
        k.boCau(t);
      } else {
        if (k.cau!.vong === GAME.vong.length - 1) k.tim(40);
        users.forEach((u, idx) => {
          if (answered.has(u.id)) return;
          const i = u.id === 'tie2' ? 8 : idx; // tie1 and tie2 behave identically: the tie-break decides their order
          const when = (i * 700 + q * 130) % total;
          if (off < when) return;
          answered.add(u.id);
          if ((i * 3 + q) % 7 === 0) return; // skipped question
          const wrong = (i + q) % 3 === 0 && i < 8;
          const letter = 'ABCD'[wrong ? (k.cau!.ans + 1) % 4 : k.cau!.ans];
          // some users send with a TikTok timestamp earlier than server time
          k.chat({ ...u, comment: i === 4 ? `đáp án ${letter}` : letter, createTime: i % 2 ? t - 120 : undefined }, t);
        });
      }
    }
    k.tick(t);
    const key = `${k.phase}:${k.cauSo}`;
    if (key !== lastKey) {
      lastKey = key;
      transitions.push(key);
      answered = new Set();
    }
    events.push(...k.lay());
    if (k.phase === 'cho' && transitions.length > 5) break;
  }
  assert.equal(k.phase, 'cho', 'golden run did not finish a round');

  const ranking = k.bxh(20).map((h) => ({ hang: h.hang, id: h.id, diem: h.diem, danhHieu: h.danhHieu, gioi: h.gioi, mien: h.mien ?? null, chuoi: h.chuoi }));
  const scores = [...k.siTu.values()].map((s) => ({ id: s.id, diem: s.diem, chuoi: s.chuoi, msDung: s.msDung })).sort((a, b) => a.id.localeCompare(b.id));
  const diemMien = k.diemMien();
  const used = Object.keys(k.used).length;
  return { transitions, events, ranking, scores, diemMien, used };
}

const fresh = JSON.parse(JSON.stringify(run()));
const again = JSON.parse(JSON.stringify(run()));
assert.deepEqual(again, fresh, 'golden run is not deterministic');

if (process.argv.includes('--update')) {
  fs.writeFileSync(fixtureUrl, JSON.stringify(fresh, null, 2) + '\n');
  console.log('golden-run: fixture written');
} else {
  assert.deepEqual(fresh, JSON.parse(fs.readFileSync(fixtureUrl, 'utf8')));
  console.log('golden-run: OK');
}
