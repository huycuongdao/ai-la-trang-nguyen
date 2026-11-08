import type { Seats, Skin } from './skin';

/** The host has one picture only: he shows his mood by moving (hop = happy, sway = sorry, breathe = thinking) */
export type Mood = 'mung' | 'tiec' | 'nghi';

export function moodOf(v: { phase: string; ketQua: { soDung: number } | null }): Mood {
  if (v.phase === 'vinhQuy' || v.phase === 'vinhDanh') return 'mung';
  if (v.phase === 'dapAn') return v.ketQua?.soDung ? 'mung' : 'tiec';
  return 'nghi';
}

/** The host's movement for each mood (motion props), shared by every kit */
export const MOVE: Record<Mood, { animate: Record<string, number[]>; transition: object }> = {
  mung: { animate: { y: [0, -18, 0] }, transition: { duration: 0.55, repeat: Infinity, ease: 'easeOut' } },
  tiec: { animate: { rotate: [-1.8, 1.8, -1.8] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  nghi: { animate: { scale: [1, 1.012, 1] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
};

/** A fixed number from an account id (a player with no photo always gets the same sample picture) */
export const hashId = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Seat n people on the mat / grandstand: the biggest token size that still fits, every row inside the
 * skin's trapezoid (near rows hold more people). Names are shown when the tokens are big enough.
 */
export function layoutSeats(s: Skin, n: number, maxSize = 150): Seats {
  if (s.seatLayout) return s.seatLayout(n, maxSize);
  const { w, h: H } = s.layout.mat;
  const Z = s.seatZone;
  const C = s.seatCell;
  for (const ten of [true, false]) {
    const cell = ten ? C.named : C.plain;
    for (let size = maxSize; size >= 34; size -= 2) {
      if (ten && size < C.nameMin) break;
      const cw = size * cell.w;
      const ch = size * cell.h;
      const y0 = H * Z.top;
      const span = H * (Z.bottom - Z.top);
      const rows = Math.floor(span / ch);
      if (rows < 1) continue;
      const cap = Array.from({ length: rows }, (_, r) => {
        const t = (ch * r + ch / 2) / span;
        const half = ((Z.topR - Z.topL) / 2 + t * ((Z.botR - Z.botL) / 2 - (Z.topR - Z.topL) / 2)) * w;
        return Math.max(0, Math.floor((half * 2) / cw));
      });
      const total = cap.reduce((a, b) => a + b, 0);
      if (total < n) continue;
      // share people by row capacity; the first people in the list sit in the upper rows
      const count = cap.map((c) => Math.floor((n * c) / total));
      let left = n - count.reduce((a, b) => a + b, 0);
      for (let r = rows - 1; left > 0; r = (r - 1 + rows) % rows) if (count[r] < cap[r]) (count[r]++, left--);
      const slack = Math.max(0, span - count.filter((c) => c > 0).length * ch) / 2;
      const pos: Seats['pos'] = [];
      let usedRow = 0;
      for (const c of count) {
        if (!c) continue;
        const y = y0 + slack + usedRow * ch + (ch - size * cell.body) / 2;
        usedRow++;
        for (let k = 0; k < c; k++) pos.push({ x: w / 2 + (k - (c - 1) / 2) * cw - size / 2, y });
      }
      return { size, ten, pos };
    }
  }
  return { size: 34, ten: false, pos: [] };
}
