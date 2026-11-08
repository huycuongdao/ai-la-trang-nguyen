// Seeded, scripted elimination game used by the golden-run test and by the round-trip tests.
import { LoaiTru, type ElimEv, type ElimPhase } from './elimination';
import type { McQ } from './exam';
import { mulberry32 } from './golden-scenario';

export const ELIM_START = 1_700_000_000_000;

/** A fixed question bank for the tests: enough questions of every level, recognisable ids */
export function testBank(): McQ[] {
  const levels = ['de', 'vua', 'kho', 'dinh', 'meo'] as const;
  return levels.flatMap((level) =>
    Array.from({ length: 40 }, (_, i) => ({ id: `${level}${i}`, q: `Câu ${level} số ${i}?`, right: `Đúng ${level}${i}`, wrong: ['Sai 1', 'Sai 2', 'Sai 3'], level })),
  );
}

/** Drives a LoaiTru with a fake clock: no voice, the question is "read" the moment it opens */
export class Driver {
  t = ELIM_START;
  readonly k: LoaiTru;
  readonly log: { phase: ElimPhase; cauSo: number; conLai: number }[] = [];

  constructor(bank = testBank(), seed = 20261108) {
    this.k = new LoaiTru(bank, {}, mulberry32(seed));
    this.k.cho(this.t);
  }

  step(ms = 250) {
    this.t += ms;
    const before = this.k.phase;
    this.k.tick(this.t);
    if (this.k.phase !== before) this.log.push({ phase: this.k.phase, cauSo: this.k.cauSo, conLai: this.k.soConLai });
  }

  /** Tick until the phase is `phase` (and, in the reading phase, finish reading so the 5 s window opens when `hoi`) */
  until(phase: ElimPhase, maxMs = 10 * 60_000) {
    for (let spent = 0; this.k.phase !== phase; spent += 250) {
      if (spent > maxMs) throw new Error(`never reached ${phase}, stuck in ${this.k.phase}`);
      if (this.k.phase === 'doc' && phase === 'hoi') {
        this.k.docXong(this.t);
        this.log.push({ phase: 'hoi', cauSo: this.k.cauSo, conLai: this.k.soConLai });
        break;
      }
      this.step();
    }
  }

  /** Let the reveal run out (the next question opens, or the winner screen) */
  afterReveal() {
    while (this.k.phase === 'dapAn') this.step();
  }

  /** Answer the open question. ok = the right letter. */
  answer(id: string, ok: boolean, name = id) {
    const right = (this.k as unknown as { cau: { ans: number } }).cau.ans;
    return this.k.chat({ id, name, avatar: '', comment: 'ABCD'[ok ? right : (right + 1) % 4] }, this.t);
  }

  join(id: string, name = id) {
    return this.k.chat({ id, name, avatar: '', comment: 'tham gia' }, this.t);
  }

  events(): ElimEv[] {
    return this.k.lay();
  }
}

/** 12 players, a few mistakes per question, to the end. Returns what must never change for the same seed. */
export function runElimScenario() {
  const d = new Driver();
  const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
  for (const id of ids) d.join(id);
  const events: ElimEv[] = [];
  d.until('doc');
  while (d.k.phase !== 'vinhDanh') {
    d.until('hoi');
    d.step(500);
    // player n is wrong on question q when (n + q) % 4 === 0; from question 3 on, p1 and p2 always answer right;
    // p12 skips question 2
    for (const id of ids) {
      const n = Number(id.slice(1));
      const wrong = (n + d.k.cauSo) % 4 === 0 && !(d.k.cauSo >= 3 && n <= 2);
      if (!(n === 12 && d.k.cauSo === 2)) d.answer(id, !wrong);
      d.step(100 + n * 40);
    }
    d.until('dapAn');
    events.push(...d.events());
    d.afterReveal();
  }
  events.push(...d.events());
  const view = d.k.view(d.t);
  return { transitions: d.log, events, winner: view.thang, conLai: view.conLai, top: view.top };
}
