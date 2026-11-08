import { artPaths, type Skin } from '../skin';

/** "Đình làng": pavilion, red wall with clouds, brick yard, woven mat. Art in art-source/dinh-lang. */
export const DINH_LANG: Skin = {
  id: 'dinh-lang',
  art: artPaths('dinh-lang'),
  size: {
    pavilion: [1200, 888],
    titleSign: [1080, 194],
    host: [480, 1200],
    gongClock: [768, 768],
    questionSign: [1200, 399],
    answerFrame: [900, 188],
    namePlate: [640, 128],
    avatarRing: [512, 512],
  },
  layout: {
    title: { x: 230, y: 12, w: 620 },
    pavilion: { x: 180, y: 392, w: 720 },
    question: { x: 190, y: 424, w: 700 },
    gong: { x: 826, y: 660, w: 240 },
    answers: { x: 32, y: 936, w: 500, gap: 16, rowGap: 10 },
    status: { x: 140, y: 1163, w: 800, h: 46 },
    mat: { x: 54, y: 1218, w: 972, h: 450 },
    host: { x: -24, y: 428, h: 480 },
    ground: { floorY: 840, cloudY: 640, cloudH: 360 },
    sideSigns: { left: { x: 16, y: 26 }, right: { x: 854, y: 26 }, w: 210, pills: { x: 28, y: 82 } },
    leaderboard: { x: 90, y: 158, w: 900, h: 226 },
    gift: { x: 908, y: 398, w: 160 },
    counter: { x: 330, y: 164, w: 420, h: 206 },
    stamp: { x: 330, y: 396, w: 420, h: 100 },
    outBadge: { x: 760, y: 700, h: 96 },
  },
  inset: {
    questionText: [57, 127, 1139, 354],
    gongDisc: { cx: 379, cy: 405, d: 308 },
    answerLetter: { x: 70, y: 47, d: 94 },
    answerText: [178, 30, 838, 158],
    avatarCircle: { cx: 252.5, cy: 260, d: 400 },
  },
  seatZone: { top: 0.12, bottom: 0.9, topL: 0.27, topR: 0.73, botL: 0.11, botR: 0.89 },
  colors: { ink: '#4a1a0c', accent: '#8a1c0c', gold: '#d9a441', cream: '#fff1cc', panel: 'rgba(58,18,8,.84)' },
};
