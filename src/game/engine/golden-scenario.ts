// Seeded, scripted game used by the golden-run and round-trip tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME } from '../config';
import { KyThi, parseMc, type Ev, type McQ, type Phase } from './exam';

const dir = new URL('../questions/', import.meta.url);

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The question bank in the fixed file order the fixture was recorded with */
export function loadGoldenBank() {
  // Fixed file order (the order the files had when the fixture was recorded), so renames never change the bank order
  const files = [
    'geography-vn', 'final-exam-scholars', 'final-mixed', 'animals-plants', 'natural-science', 'history-vn-modern',
    'history-vn-ancient-medieval', 'riddles-wordplay-folk', 'riddles-logic-situations', 'inventions-arts-sports',
    'biology-health', 'world', 'culture-food-vn', 'literature-vietnamese',
  ].map((f) => `${f}.txt`);
  assert.deepEqual([...files].sort(), fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort(), 'question file list changed');
  return files.flatMap((f) => parseMc(fs.readFileSync(new URL(f, dir), 'utf8')));
}

/** What the scenario needs from whatever runs the game: the engine directly, or the server game host. */
export interface Rig {
  room(): KyThi;
  chat(u: { id: string; name: string; avatar: string }, comment: string, createTime: number | undefined, t: number): void;
  gift(u: { id: string; name: string; avatar: string }, coins: number, t: number): void;
  tim(n: number, t: number): void;
  boCau(t: number): void;
  /** The voice has had time to finish reading the question: the answer timer may start */
  speechDone(t: number): void;
  tick(t: number): void;
  /** Engine events since the last call */
  events(): Ev[];
}

export const GOLDEN_START = 1_700_000_000_000;
export const goldenRand = () => mulberry32(20261108);

export function directRig(bank: McQ[], cutAt?: Phase): Rig & { cut(): boolean } {
  const rand = goldenRand();
  let k = new KyThi(bank, {}, rand);
  let cut = !cutAt;
  k.cho(GOLDEN_START);
  return {
    room: () => k,
    chat: (u, comment, createTime, t) => void k.chat({ ...u, comment, createTime }, t),
    gift: (u, coins, t) => k.tangQua({ id: u.id, name: u.name, avatar: u.avatar, gift: 'Rose', count: 1, coins, big: coins >= 99 }, t),
    tim: (n) => k.tim(n),
    boCau: (t) => k.boCau(t),
    speechDone: (t) => {
      // fake voice finishes reading 2 s after the question opens
      if (k.phase === 'doc' && t >= k.endsAt - (GAME.docMaxSec - 2) * 1000) k.docXong(t);
    },
    tick: (t) => {
      k.tick(t);
      if (!cut && k.phase === cutAt) {
        // simulate a restart: the state goes through JSON into a fresh engine (same random stream continues)
        cut = true;
        const snap = JSON.parse(JSON.stringify(k.snapshot(t)));
        const next = new KyThi(bank, k.used, rand);
        assert.ok(next.restore(snap), 'restore failed');
        k = next;
      }
    },
    events: () => k.lay(),
    cut: () => cut,
  };
}

export function runScenario(cutAt?: Phase, makeRig: (bank: McQ[]) => Rig = (bank) => directRig(bank, cutAt)) {
  const bank = loadGoldenBank();
  const rig = makeRig(bank);
  let t = GOLDEN_START;
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

  // one chat line before the round: region and gender picks are remembered
  rig.chat(users[0], 'miền Bắc', undefined, t);
  rig.chat(users[1], 'nam bộ', undefined, t);
  rig.chat(users[2], 'trung', undefined, t);
  rig.chat(users[2], 'nữ', undefined, t);
  rig.chat(users[3], 'con trai', undefined, t);

  for (let guard = 0; guard < 20000; guard++) {
    t += 500;
    tick++;
    if (giftsAt.has(tick)) {
      const u = users[tick % users.length];
      rig.gift(u, tick === 200 ? 199 : 1, t);
    }
    rig.speechDone(t);
    const k = rig.room();
    if (k.phase === 'hoi') {
      const q = k.cauSo;
      const total = GAME.vong[k.cau!.vong].giay * 1000;
      const shown = k.endsAt - total;
      const off = t - shown;
      if (q === 7 && !boDone && off >= 3000) {
        boDone = true;
        rig.boCau(t);
      } else {
        if (k.cau!.vong === GAME.vong.length - 1) rig.tim(40, t);
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
          rig.chat(u, i === 4 ? `đáp án ${letter}` : letter, i % 2 ? t - 120 : undefined, t);
        });
      }
    }
    rig.tick(t);
    const kk = rig.room();
    const key = `${kk.phase}:${kk.cauSo}`;
    if (key !== lastKey) {
      lastKey = key;
      transitions.push(key);
      answered = new Set();
    }
    events.push(...rig.events());
    if (kk.phase === 'cho' && transitions.length > 5) break;
  }
  assert.ok(!('cut' in rig) || (rig as ReturnType<typeof directRig>).cut(), `phase ${cutAt} never reached`);
  const k = rig.room();
  assert.equal(k.phase, 'cho', 'golden run did not finish a round');

  const ranking = k.bxh(20).map((h) => ({ hang: h.hang, id: h.id, diem: h.diem, danhHieu: h.danhHieu, gioi: h.gioi, mien: h.mien ?? null, chuoi: h.chuoi }));
  const scores = [...k.siTu.values()].map((s) => ({ id: s.id, diem: s.diem, chuoi: s.chuoi, msDung: s.msDung })).sort((a, b) => a.id.localeCompare(b.id));
  const diemMien = k.diemMien();
  const used = Object.keys(k.used).length;
  return { transitions, events, ranking, scores, diemMien, used };
}

