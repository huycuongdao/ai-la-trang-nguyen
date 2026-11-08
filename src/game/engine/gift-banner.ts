import { GAME } from '../config';

/** A gift thank-you banner on the screen. Gifts never give an advantage in the exam mode. */
export interface Qua {
  id: string;
  name: string;
  avatar: string;
  gift: string;
  count: number;
  coins: number;
  big: boolean;
  at: number;
}

export type QuaHien = Qua & { den: number };

/** One banner at a time, others wait in line: big gifts go first, the line is capped, the same giver in a row is merged. */
export class GiftBanner {
  cho: Qua[] = [];
  hien: QuaHien | null = null;

  tang(q: Omit<Qua, 'at'>, now: number) {
    const cu = this.hien?.id === q.id && this.hien.gift === q.gift ? this.hien : this.cho.find((x) => x.id === q.id && x.gift === q.gift);
    if (cu) {
      cu.count += q.count;
      cu.coins += q.coins;
      cu.big ||= q.big;
      return;
    }
    this.cho.push({ ...q, at: now });
    // quà to chen lên trước; hàng chờ có trần, quá thì bỏ quà nhỏ cũ nhất
    this.cho.sort((a, b) => Number(b.big) - Number(a.big));
    if (this.cho.length > 6) this.cho.pop(); // đã xếp quà to lên đầu nên cuối hàng là quà nhỏ mới nhất
    this.chay(now);
  }

  /** Show the next banner when the current one has run out */
  chay(now: number) {
    if (this.hien && now < this.hien.den) return;
    const q = this.cho.shift();
    this.hien = q ? { ...q, at: now, den: now + (q.big ? GAME.quaToSec : GAME.quaSec) * 1000 } : null;
  }

  /** The banner for the view (without the end time) */
  view() {
    const q = this.hien;
    return q && { id: q.id, name: q.name, avatar: q.avatar, gift: q.gift, count: q.count, big: q.big, at: q.at };
  }
}
