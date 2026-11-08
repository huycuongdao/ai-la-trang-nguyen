import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { useSkin, type Skin } from './skin';

/**
 * Building blocks shared by both game modes, drawn from the active skin (see skin.tsx).
 * Screen is 1080x1920; leave 250px at the bottom and the right edge free for the TikTok interface.
 */

/** Height of a picture drawn `w` wide, from the source picture's shape */
const tall = (s: Skin, key: keyof Skin['size'], w: number) => (w * s.size[key][1]) / s.size[key][0];

// ---------------- scene ----------------

/** Background, floor, clouds, pavilion and title sign: the same in every round */
export function Scene() {
  const s = useSkin();
  const { pavilion: p, title: t, ground: g } = s.layout;
  return (
    <div className="pointer-events-none absolute inset-0">
      <img src={s.art.background} className="absolute left-0 top-0" style={{ width: 1080, height: 1920 }} draggable={false} />
      <img
        src={s.art.floor}
        className="absolute left-0"
        style={{ top: g.floorY, width: 1080, height: 1080, WebkitMaskImage: 'linear-gradient(transparent, #000 16%)', maskImage: 'linear-gradient(transparent, #000 16%)' }}
        draggable={false}
      />
      {/* cloud strip hides where the floor meets the wall; shows on both sides of the pavilion */}
      <img src={s.art.cloudBorder} className="absolute left-0" style={{ top: g.cloudY, width: 1080, height: g.cloudH }} draggable={false} />
      <img src={s.art.pavilion} className="absolute" style={{ left: p.x, top: p.y, width: p.w, filter: 'drop-shadow(0 14px 14px rgba(40,6,2,.5))' }} draggable={false} />
      <img src={s.art.titleSign} className="absolute" style={{ left: t.x, top: t.y, width: t.w, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.45))' }} draggable={false} />
    </div>
  );
}

// ---------------- host ----------------

/** The host has one picture only: he shows his mood by moving (hop = happy, sway = sorry, breathe = thinking) */
export type Mood = 'mung' | 'tiec' | 'nghi';

export function moodOf(v: { phase: string; ketQua: { soDung: number } | null }): Mood {
  if (v.phase === 'vinhQuy' || v.phase === 'vinhDanh') return 'mung';
  if (v.phase === 'dapAn') return v.ketQua?.soDung ? 'mung' : 'tiec';
  return 'nghi';
}

const MOVE: Record<Mood, { animate: Record<string, number[]>; transition: object }> = {
  mung: { animate: { y: [0, -18, 0] }, transition: { duration: 0.55, repeat: Infinity, ease: 'easeOut' } },
  tiec: { animate: { rotate: [-1.8, 1.8, -1.8] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  nghi: { animate: { scale: [1, 1.012, 1] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
};

export function Host({ mood, ten }: { mood: Mood; ten: string }) {
  const s = useSkin();
  const { x, y, h: ht } = s.layout.host;
  const m = MOVE[mood];
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y, height: ht, zIndex: 1100 }}>
      <div
        className="absolute left-1/2 top-[-14px] z-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-3 text-[22px] font-extrabold leading-[34px]"
        style={{ background: 'linear-gradient(#ffd34d,#e8a33d)', borderColor: '#fff3c4', color: s.colors.ink, boxShadow: '0 3px 8px rgba(0,0,0,.4)' }}
      >
        🖌️ {ten}
      </div>
      <motion.img
        key={mood}
        src={s.art.host}
        animate={m.animate}
        transition={m.transition}
        style={{ height: ht, transformOrigin: 'bottom center', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' }}
        draggable={false}
      />
    </div>
  );
}

// ---------------- question sign, clock, answer frames ----------------

/** The question sign hung in front of the pavilion; `children` sit inside its writable area */
export function QuestionSign({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const s = useSkin();
  const q = s.layout.question;
  const k = q.w / s.size.questionSign[0];
  const [l, t, r, b] = s.inset.questionText;
  return (
    <div className="absolute" style={{ left: q.x, top: q.y, width: q.w, height: tall(s, 'questionSign', q.w), zIndex: 20 }}>
      <img src={s.art.questionSign} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 10px 10px rgba(30,6,2,.5))' }} draggable={false} />
      <div className="absolute flex flex-col items-center justify-center px-3 text-center" style={{ left: l * k, width: (r - l) * k, top: t * k, height: (b - t) * k, color: s.colors.ink, ...style }}>
        {children}
      </div>
    </div>
  );
}

/** Clock with the countdown number on its face */
export function GongClock({ value, low }: { value: number | null; low?: boolean }) {
  const s = useSkin();
  const g = s.layout.gong;
  const k = g.w / s.size.gongClock[0];
  const d = s.inset.gongDisc.d * k;
  return (
    <div className="absolute" style={{ left: g.x, top: g.y, width: g.w, height: tall(s, 'gongClock', g.w), zIndex: 25 }}>
      <img src={s.art.gongClock} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 10px 10px rgba(30,6,2,.5))' }} draggable={false} />
      {value !== null && (
        <motion.div
          key={low ? `l${value}` : 'n'}
          initial={low ? { scale: 1.4 } : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={low ? { type: 'spring', stiffness: 500, damping: 14 } : undefined}
          className="absolute flex items-center justify-center rounded-full font-extrabold tabular-nums leading-none"
          style={{ left: s.inset.gongDisc.cx * k - d / 2, top: s.inset.gongDisc.cy * k - d / 2, width: d, height: d, fontSize: d * 0.62, color: low ? '#c8102e' : s.colors.ink }}
        >
          {value}
        </motion.div>
      )}
    </div>
  );
}

export type AnswerState = { right: boolean; dim: boolean; wiped: boolean };

/** Answer frame: the letter in its circle on the left, the answer on the paper. `index` 0-3 */
export function AnswerFrame({ index, delay, state, children }: { index: number; delay: number; state: AnswerState; children: ReactNode }) {
  const s = useSkin();
  const a = s.layout.answers;
  const ht = tall(s, 'answerFrame', a.w);
  const k = a.w / s.size.answerFrame[0];
  const { answerLetter: L, answerText: T } = s.inset;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: state.dim ? 0.5 : 1, y: 0, scale: state.right ? 1.04 : 1, x: state.dim ? [0, -8, 8, -5, 5, 0] : 0 }}
      transition={{ delay, x: { duration: 0.45, delay: 0.5 } }}
      className="absolute"
      style={{ left: a.x + (index % 2) * (a.w + a.gap), top: a.y + (index < 2 ? 0 : ht + a.rowGap), width: a.w, height: ht, zIndex: 10 }}
    >
      <img src={s.art.answerFrame} className="absolute inset-0 h-full w-full" style={{ filter: state.right ? 'drop-shadow(0 0 16px rgba(120,255,160,.95)) hue-rotate(60deg) saturate(1.3)' : 'drop-shadow(0 6px 6px rgba(30,6,2,.45))' }} draggable={false} />
      <div className="absolute flex items-center justify-center font-extrabold leading-none" style={{ left: L.x * k, top: L.y * k, width: L.d * k, height: L.d * k, fontSize: L.d * k * 0.67, color: s.colors.accent }}>
        {'ABCD'[index]}
      </div>
      <div className="absolute flex flex-col justify-center" style={{ left: T[0] * k, width: (T[2] - T[0]) * k, top: T[1] * k, height: (T[3] - T[1]) * k, color: s.colors.ink }}>
        {children}
      </div>
      {/* the right answer blinks 4 times when revealed */}
      {state.right && <div className="nhap-nhay pointer-events-none absolute inset-[8px] rounded-[40px]" />}
    </motion.div>
  );
}

// ---------------- mat and seats ----------------

/** The mat the players sit on: the picture stretched over the mat box; `children` use the mat's top-left corner as origin */
export function Mat({ children }: { children: ReactNode }) {
  const s = useSkin();
  const m = s.layout.mat;
  return (
    <div className="absolute" style={{ left: m.x, top: m.y, width: m.w, height: m.h, zIndex: 5 }}>
      <img src={s.art.mat} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 12px 14px rgba(30,6,2,.5))' }} draggable={false} />
      {children}
    </div>
  );
}

const NAME_MIN = 84; // smaller pictures get no name (the text would be too small on a phone)

export interface Seats {
  size: number;
  ten: boolean;
  pos: { x: number; y: number }[]; // top-left of each picture, relative to the mat
}

/**
 * Seat n people: the biggest picture size that still fits, every row inside the mat's trapezoid
 * (the near rows hold more people). Names are shown when the pictures are big enough.
 */
export function layoutSeats(s: Skin, n: number, maxSize = 150): Seats {
  const { w, h: H } = s.layout.mat;
  const Z = s.seatZone;
  for (const ten of [true, false]) {
    for (let size = maxSize; size >= 34; size -= 2) {
      if (ten && size < NAME_MIN) break;
      const cw = size * (ten ? 1.5 : 1.12);
      const ch = size * (ten ? 1.34 : 1.1);
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
        const y = y0 + slack + usedRow * ch + (ch - size * (ten ? 1.34 : 1)) / 2;
        usedRow++;
        for (let k = 0; k < c; k++) pos.push({ x: w / 2 + (k - (c - 1) / 2) * cw - size / 2, y });
      }
      return { size, ten, pos };
    }
  }
  return { size: 34, ten: false, pos: [] };
}

/** A fixed number from an account id (a player with no photo always gets the same sample picture) */
export const hashId = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** TikTok photo inside the ring; no photo = the male / female sample picture */
export function RingAvatar({ avatar, gioi, id, size }: { avatar: string; gioi?: 'nam' | 'nu'; id: string; size: number }) {
  const s = useSkin();
  const nu = gioi ? gioi === 'nu' : hashId(id) % 2 === 1;
  const [rw, rh] = s.size.avatarRing;
  const c = s.inset.avatarCircle;
  const d = (c.d / rw) * size;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute overflow-hidden rounded-full" style={{ left: (c.cx / rw) * size - d / 2, top: (c.cy / rh) * size - d / 2, width: d, height: d, background: '#f3dcae' }}>
        <img src={avatar || (nu ? s.art.avatarFemale : s.art.avatarMale)} referrerPolicy="no-referrer" className="h-full w-full object-cover" draggable={false} />
      </div>
      <img src={s.art.avatarRing} className="absolute inset-0 h-full w-full" draggable={false} />
    </div>
  );
}

/** Name plate: the text shrinks to fit */
export function NamePlate({ name, w, gold, extra }: { name: string; w: number; gold?: boolean; extra?: ReactNode }) {
  const s = useSkin();
  const ht = tall(s, 'namePlate', w);
  const chars = [...name].length + (extra ? 2 : 0);
  const font = Math.max(12, Math.min(ht * 0.58, (w * 0.86) / (chars * 0.58)));
  return (
    <div className="relative shrink-0" style={{ width: w, height: ht }}>
      <img src={s.art.namePlate} className="absolute inset-0 h-full w-full" style={gold ? { filter: 'hue-rotate(-8deg) saturate(1.6) brightness(1.1)' } : undefined} draggable={false} />
      <div className="absolute flex items-center justify-center gap-1 whitespace-nowrap font-extrabold" style={{ left: w * 0.06, right: w * 0.06, top: 0, bottom: 0, fontSize: font, lineHeight: 1, color: s.colors.ink }}>
        <span className="truncate">{name}</span>
        {extra}
      </div>
    </div>
  );
}

/** One person on the mat: ring photo, name plate (when there is room), points flying up at the reveal */
export function Seat({
  id, name, avatar, gioi, size, ten, x, y, crown, out, right, gain, jump,
}: {
  id: string; name: string; avatar: string; gioi?: 'nam' | 'nu'; size: number; ten: boolean; x: number; y: number;
  crown?: string; out?: boolean; right?: boolean; gain?: number; jump?: boolean;
}) {
  const pw = Math.min(size * 1.5, 230);
  const cut = size > 130 ? 14 : 11;
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ width: size, filter: out ? 'grayscale(1)' : undefined, zIndex: Math.round(y) }}
      initial={{ opacity: 0, scale: 0.3, left: x, top: y }}
      animate={{ opacity: out ? 0.55 : 1, scale: 1, left: x, top: y, ...(jump ? { y: [0, -size * 0.12, 0] } : {}) }}
      exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      <div className="relative">
        <RingAvatar avatar={avatar} gioi={gioi} id={id} size={size} />
        {crown && <div className="absolute left-1/2 -translate-x-1/2 leading-none" style={{ top: -size * 0.16, fontSize: size * 0.3 }}>{crown}</div>}
        {right && <div className="absolute rounded-full" style={{ left: size * 0.1, top: size * 0.11, width: size * 0.8, height: size * 0.8, boxShadow: '0 0 0 4px #9dffb3, 0 0 20px #9dffb3' }} />}
        {out && (
          <div className="absolute flex items-center justify-center rounded-full bg-black/45 font-extrabold" style={{ left: size * 0.1, top: size * 0.11, width: size * 0.8, height: size * 0.8, color: '#ff5a4d', fontSize: size * 0.7, lineHeight: 1 }}>✕</div>
        )}
        <AnimatePresence>
          {!!gain && (
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-extrabold"
              style={{ bottom: size * 0.85, fontSize: Math.max(22, size * 0.28), color: gain > 0 ? '#7dff9a' : '#ff8a80', textShadow: '0 2px 4px #000' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -6 }}
              exit={{ opacity: 0 }}
            >
              {gain > 0 ? `+${gain}` : gain}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {ten && <div className="-mt-1"><NamePlate name={[...name].slice(0, cut).join('')} w={pw} gold={!!crown} /></div>}
    </motion.div>
  );
}
