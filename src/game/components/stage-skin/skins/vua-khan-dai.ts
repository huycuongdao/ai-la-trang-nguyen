import { VUA_KHAN_DAI_KIT } from '../kits/vua-khan-dai';
import type { Seats, Skin } from '../skin';

const dir = '/assets/vua-khan-dai';

/**
 * Seats of the grandstand, as in the mockup: 5 chairs per row (up to 50 people), rows 0.63 of a chair apart so each row
 * sits a little in front of the one above. More than 50 people: smaller chairs, more per row.
 */
const MAT = { w: 1080, h: 955 };
const TOP = 58; // top of the first row, from the top of the mat
const seatLayout = (n: number): Seats => {
  const fit = (size: number, cols: number) => {
    const rows = Math.max(1, Math.ceil(n / cols));
    return TOP + (rows - 1) * size * 0.63 + size <= MAT.h;
  };
  let size = 146;
  let cols = 5;
  if (n > 50) {
    for (size = 146; size > 34; size -= 2) {
      cols = Math.max(5, Math.floor(1000 / (size * 1.08)));
      if (fit(size, cols)) break;
    }
  }
  const pos: Seats['pos'] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i % cols;
    pos.push({ x: MAT.w / 2 + (c - (inRow - 1) / 2) * size * 1.08 - size / 2, y: TOP + r * size * 0.63 });
  }
  return { size, ten: size >= 90, pos };
};

/** "Vua Khán Đài" (football), laid out like the owner's mockup. Art in art-source/vua-khan-dai. */
export const VUA_KHAN_DAI: Skin = {
  id: 'vua-khan-dai',
  art: {
    background: `${dir}/stadium-background.webp`,
    pitch: `${dir}/pitch-ground.webp`,
    accents: `${dir}/graphic-accents.webp`,
    logo: `${dir}/title-logo.webp`,
    host: `${dir}/host-mc.webp`,
    terraces: `${dir}/grandstand-terraces.webp`,
    chair: `${dir}/player-chair.webp`,
    answerButton: `${dir}/answer-button.webp`,
    timerRing: `${dir}/timer-ring.webp`,
    statusBar: `${dir}/round-status-bar.webp`,
    nameplate: `${dir}/player-nameplate.webp`,
    male: `${dir}/player-male.webp`,
    female: `${dir}/player-female.webp`,
  },
  // source size of the exported pictures (see tools/prepare-theme-art.mjs output)
  size: {
    logo: [1000, 273],
    answerButton: [1000, 156],
    timerRing: [420, 418],
    statusBar: [1000, 81],
    nameplate: [640, 108],
    chair: [420, 335],
    male: [420, 584],
    female: [420, 630],
  },
  layout: {
    title: { x: 195, y: 6, w: 690 },
    pitch: { y: 1832 },
    statusBar: { x: 146, y: 229, w: 808 },
    ring: { x: 838, y: 204, w: 117 },
    host: { x: -22, y: 312, h: 430 },
    question: { x: 263, y: 312, w: 740, h: 166 },
    answers: { x: 278, y: 483, w: 371, h: 80, gapX: 24, gapY: 14 },
    status: { x: 130, y: 682, w: 820, h: 40 },
    mat: { x: 0, y: 762, w: MAT.w, h: MAT.h },
    rules: { x: 135, y: 1712, w: 810, h: 114 },
    // not drawn in this theme (see `hide`), but the type asks for them
    leaderboard: { x: 90, y: 246, w: 900, h: 226 },
    gift: { x: 900, y: 8, w: 165 },
    counter: { x: 330, y: 246, w: 420, h: 206 },
    stamp: { x: 330, y: 690, w: 420, h: 100 },
    outBadge: { x: 700, y: 440, h: 84 },
  },
  inset: {},
  seatCell: { nameMin: 90, named: { w: 1.12, h: 1.1, body: 1.08 }, plain: { w: 1, h: 0.98, body: 1.08 } },
  seatZone: { top: 0.08, bottom: 0.94, topL: 0.12, topR: 0.88, botL: 0.05, botR: 0.95 },
  seatLayout,
  maxSeats: 45,
  hide: { leaderboard: true, gift: true, counter: true },
  kit: VUA_KHAN_DAI_KIT,
  colors: { ink: '#ffffff', accent: '#2fe6a0', gold: '#2fe6a0', cream: '#f3e9ff', good: '#6dffb5', bad: '#ff7a8a', panel: 'rgba(42,10,58,.88)' },
};
