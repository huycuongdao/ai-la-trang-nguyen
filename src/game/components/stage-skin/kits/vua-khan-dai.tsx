import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOVE, hashId, type Mood } from '../common';
import { useSkin, type HeaderProps, type Kit, type SeatProps } from '../skin';
import { GiftBoard } from './gift-board';

/**
 * "Vua Khán Đài" kit (football), drawn to match the owner's full-screen mockup: purple stadium, logo on top,
 * status bar with the ring timer at its end, the MC on the left, the question as plain white text with 2x2 answers beside him,
 * a grandstand of chairs with the players' names on them, a rules box at the bottom and a strip of pitch.
 * Pictures: art-source/vua-khan-dai (prepared by tools/prepare-theme-art.mjs). Numbers: skins/vua-khan-dai.ts.
 */
const GREEN = '#2fe6a0';
const PINK = '#ff4f9a';
const DARK = '#2a0a3a';

const tall = (size: readonly [number, number], w: number) => (w * size[1]) / size[0];

function Scene() {
  const s = useSkin();
  const { title: t, pitch } = s.layout;
  return (
    <div className="pointer-events-none absolute inset-0">
      <img src={s.art.background} className="absolute left-0 top-0" style={{ width: 1080, height: 1920 }} draggable={false} />
      <img src={s.art.accents} className="absolute left-0 top-0 opacity-90" style={{ width: 1080, height: 1920 }} draggable={false} />
      {/* a strip of pitch along the bottom edge */}
      <img
        src={s.art.pitch}
        className="absolute left-0 object-cover"
        style={{ top: pitch.y, width: 1080, height: 1920 - pitch.y, WebkitMaskImage: 'linear-gradient(transparent, #000 35%)', maskImage: 'linear-gradient(transparent, #000 35%)' }}
        draggable={false}
      />
      <img src={s.art.logo} className="absolute" style={{ left: t.x, top: t.y, width: t.w, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.5))' }} draggable={false} />
    </div>
  );
}

/** Status bar: question number on the green part, the exam name or "CÒN LẠI 8/30" after the slash */
function Header({ main, total, label, detail, gold, rounds }: HeaderProps) {
  const s = useSkin();
  const b = s.layout.statusBar;
  const ht = tall(s.size.statusBar, b.w);
  const fit = (text: string, w: number, max: number) => Math.min(max, w / ([...text].length * 0.64));
  const right = detail ?? (total ? `${label} · ${total} CÂU` : label);
  return (
    <>
      <div className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: ht, zIndex: 30, filter: gold ? 'drop-shadow(0 0 14px rgba(255,79,154,.9))' : 'drop-shadow(0 4px 6px rgba(0,0,0,.45))' }}>
        <img src={s.art.statusBar} className="absolute inset-0 h-full w-full" draggable={false} />
        <div className="absolute flex items-center justify-center whitespace-nowrap font-extrabold italic leading-none" style={{ left: '3%', width: '24%', top: 0, bottom: 0, color: DARK, fontSize: fit(main, b.w * 0.24, ht * 0.66) }}>{main}</div>
        <div className="absolute flex items-center justify-center whitespace-nowrap font-bold italic leading-none" style={{ left: '48%', width: '36%', top: 0, bottom: 0, color: gold ? PINK : '#fff', fontSize: fit(right, b.w * 0.36, ht * 0.56) }}>{right.toUpperCase()}</div>
      </div>
      {rounds && (
        <div className="absolute flex justify-center gap-2" style={{ left: b.x, width: b.w * 0.88, top: b.y + ht + 4, zIndex: 30 }}>
          {rounds.map((r, i) => (
            <span key={i} className="h-2 w-14 rounded-full" style={{ background: r === 'done' ? GREEN : r === 'now' ? '#fff' : 'rgba(255,255,255,.25)' }} />
          ))}
        </div>
      )}
    </>
  );
}

/** The MC (no name tag, as in the mockup) */
function Host({ mood }: { mood: Mood; ten: string }) {
  const s = useSkin();
  const { x, y, h } = s.layout.host;
  const m = MOVE[mood];
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y, height: h, zIndex: 1100 }}>
      <motion.img key={mood} src={s.art.host} animate={m.animate} transition={m.transition} style={{ height: h, transformOrigin: 'bottom center', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.55))' }} draggable={false} />
    </div>
  );
}

/** The question is plain white text on the stadium (no panel), left aligned; the screens write for a smaller sign, so it is scaled up */
function QuestionSign({ children }: { children: ReactNode }) {
  const s = useSkin();
  const q = s.layout.question;
  const k = 1.3;
  return (
    <div className="absolute flex items-center" style={{ left: q.x, top: q.y, width: q.w, height: q.h, zIndex: 20, color: '#fff', textShadow: '0 3px 8px rgba(30,0,40,.6)' }}>
      <div className="flex flex-col items-start text-left" style={{ width: q.w / k, transform: `scale(${k})`, transformOrigin: 'left center' }}>{children}</div>
    </div>
  );
}

/** Ring timer at the end of the status bar: the ring empties clockwise as time runs out; the number sits in the middle */
function GongClock({ value, total, low }: { value: number | null; total: number; low?: boolean }) {
  const s = useSkin();
  const r = s.layout.ring;
  const ht = tall(s.size.timerRing, r.w);
  const elapsed = value === null || total <= 0 ? 0 : Math.max(0, Math.min(1, 1 - value / total)) * 360;
  const mask = `conic-gradient(from ${elapsed}deg, #000 0deg, #000 ${360 - elapsed}deg, transparent ${360 - elapsed}deg)`;
  return (
    <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: ht, zIndex: 31, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.5))' }}>
      <div className="absolute inset-[7%] rounded-full" style={{ background: 'rgba(42,10,58,.92)' }} />
      <img src={s.art.timerRing} className="absolute inset-0 h-full w-full opacity-25" draggable={false} />
      {value !== null && <img src={s.art.timerRing} className="absolute inset-0 h-full w-full" style={{ WebkitMaskImage: mask, maskImage: mask }} draggable={false} />}
      {value !== null && (
        <motion.div
          key={low ? `l${value}` : 'n'}
          initial={low ? { scale: 1.4 } : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={low ? { type: 'spring', stiffness: 500, damping: 14 } : undefined}
          className="absolute inset-0 flex items-center justify-center font-extrabold tabular-nums leading-none"
          style={{ fontSize: r.w * 0.4, color: low ? PINK : '#fff' }}
        >
          {String(value).padStart(2, '0')}
        </motion.div>
      )}
    </div>
  );
}

/** Answer button (2x2 beside the MC): the letter on the green slanted tile, the answer on the purple body */
function AnswerFrame({ index, delay, state, len, children }: { index: number; delay: number; state: { right: boolean; dim: boolean; wiped: boolean }; len: number; children: ReactNode }) {
  const s = useSkin();
  const a = s.layout.answers;
  // the answer's own sizes are overridden (.vkd-answer in index.css): one size per answer, smaller for longer ones
  const font = len <= 11 ? 38 : len <= 15 ? 33 : len <= 19 ? 28 : 25;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: state.dim ? 0.5 : 1, y: 0, x: state.dim ? [0, -8, 8, -5, 5, 0] : 0, scale: state.right ? 1.03 : 1 }}
      transition={{ delay, x: { duration: 0.45, delay: state.dim ? 0.5 : delay } }}
      className="absolute"
      style={{ left: a.x + (index % 2) * (a.w + a.gapX), top: a.y + Math.floor(index / 2) * (a.h + a.gapY), width: a.w, height: a.h, zIndex: 10 }}
    >
      <img src={s.art.answerButton} className="absolute inset-0 h-full w-full" style={{ filter: state.right ? `drop-shadow(0 0 18px ${GREEN}) hue-rotate(220deg) saturate(1.5) brightness(1.3)` : 'drop-shadow(0 5px 6px rgba(0,0,0,.45))' }} draggable={false} />
      <div className="absolute flex items-center justify-center font-extrabold italic leading-none" style={{ left: '4.2%', top: '22%', width: '12.4%', height: '54%', fontSize: a.h * 0.46, color: DARK }}>{'ABCD'[index]}</div>
      <div className="vkd-answer absolute flex items-center" style={{ left: '21%', width: '76%', top: 0, bottom: 0, color: '#fff', fontSize: font, lineHeight: 1.1 }}>
        <div className="flex min-w-0 flex-1 flex-col justify-center">{children}</div>
      </div>
      {state.right && <div className="nhap-nhay pointer-events-none absolute inset-[6px] rounded-[30px]" />}
    </motion.div>
  );
}

/** Line between the answers and the grandstand: italic text with a thin line on each side */
function StatusLine({ children }: { children: ReactNode }) {
  const s = useSkin();
  const st = s.layout.status;
  const line = { flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN})` };
  return (
    <div className="absolute flex items-center gap-4" style={{ left: st.x, top: st.y, width: st.w, height: st.h, zIndex: 1700 }}>
      <div style={line} />
      <div className="max-w-[86%] truncate text-[26px] font-semibold italic leading-none" style={{ color: '#fff' }}>{children}</div>
      <div style={{ ...line, background: `linear-gradient(270deg, transparent, ${GREEN})` }} />
    </div>
  );
}

/** Rules box near the bottom (it sits low: TikTok may cover it) */
function Rules({ title, lines }: { title: string; lines: [string, string][] }) {
  const s = useSkin();
  const r = s.layout.rules;
  return (
    <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 40 }}>
      <div className="absolute inset-x-0 bottom-0 top-[16px] rounded-[22px] border-2" style={{ background: 'rgba(60,10,70,.75)', borderColor: 'rgba(255,79,154,.55)' }} />
      <div className="absolute left-0 right-0 top-0 flex items-center justify-center gap-3">
        <div className="h-[2px] w-24" style={{ background: `linear-gradient(90deg, transparent, ${GREEN})` }} />
        <div className="rounded-full border-2 px-5 text-[22px] font-extrabold leading-[30px]" style={{ borderColor: GREEN, color: GREEN, background: '#3a0f4a' }}>{title}</div>
        <div className="h-[2px] w-24" style={{ background: `linear-gradient(270deg, transparent, ${GREEN})` }} />
      </div>
      <div className="absolute inset-x-0 bottom-3 top-[40px] flex flex-col items-center justify-center text-center text-[25px] font-semibold uppercase leading-[1.2]" style={{ color: '#fff' }}>
        {lines.map(([a, b]) => (
          <div key={a}>{a} <b style={{ color: GREEN }}>{b}</b></div>
        ))}
      </div>
    </div>
  );
}

/** The grandstand: the terraces picture stretched over the mat box */
function Mat({ children }: { children: ReactNode }) {
  const s = useSkin();
  const m = s.layout.mat;
  return (
    <div className="absolute" style={{ left: m.x, top: m.y, width: m.w, height: m.h, zIndex: 5 }}>
      <img src={s.art.terraces} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 10px 12px rgba(0,0,0,.4))' }} draggable={false} />
      {children}
    </div>
  );
}

/** Photo in a green circle; no photo = the head of the male / female picture */
function RingAvatar({ avatar, gioi, id, size }: { avatar: string; gioi?: 'nam' | 'nu'; id: string; size: number }) {
  const s = useSkin();
  const nu = gioi ? gioi === 'nu' : hashId(id) % 2 === 1;
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size, border: `${Math.max(3, size * 0.04)}px solid ${GREEN}`, background: '#4a1a62' }}>
      <img src={avatar || (nu ? s.art.female : s.art.male)} referrerPolicy="no-referrer" className="h-full w-full object-cover" style={{ objectPosition: avatar ? 'center' : 'top' }} draggable={false} />
    </div>
  );
}

function NamePlate({ name, w, gold }: { name: string; w: number; gold?: boolean }) {
  const s = useSkin();
  const ht = tall(s.size.nameplate, w);
  const font = Math.max(12, Math.min(ht * 0.52, (w * 0.82) / ([...name].length * 0.6)));
  return (
    <div className="relative shrink-0" style={{ width: w, height: ht }}>
      <img src={s.art.nameplate} className="absolute inset-0 h-full w-full" style={gold ? { filter: 'hue-rotate(110deg) saturate(2.2) brightness(1.6)' } : undefined} draggable={false} />
      <div className="absolute flex items-center justify-center whitespace-nowrap font-extrabold" style={{ left: '8%', right: '8%', top: 0, bottom: 0, fontSize: font, lineHeight: 1, color: gold ? DARK : '#fff' }}>
        <span className="truncate">{name}</span>
      </div>
    </div>
  );
}

/**
 * One person in the grandstand: a chair (green or purple, fixed per person), the person sitting in it, and the name on the
 * seat. Token box: top = top of the head, width = size; the chair starts a little lower.
 */
function Seat({ id, name, avatar, gioi, size, ten, x, y, crown, out, right, gain, jump, score }: SeatProps) {
  const s = useSkin();
  const nu = gioi ? gioi === 'nu' : hashId(id) % 2 === 1;
  const purple = hashId(id + 'c') % 2 === 0;
  const chairH = tall(s.size.chair, size);
  const fw = size * 0.5;
  const fh = tall(nu ? s.size.female : s.size.male, fw);
  const shown = avatar ? fw : fh;
  const font = Math.max(11, size * 0.125);
  return (
    <motion.div
      className="absolute"
      style={{ width: size, height: size * 0.98, filter: out ? 'grayscale(1)' : undefined, zIndex: Math.round(y) }}
      initial={{ opacity: 0, scale: 0.3, left: x, top: y }}
      animate={{ opacity: out ? 0.55 : 1, scale: 1, left: x, top: y, ...(jump ? { y: [0, -size * 0.12, 0] } : {}) }}
      exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      <img src={s.art.chair} className="absolute left-0" style={{ top: size * 0.18, width: size, height: chairH, filter: purple ? 'hue-rotate(165deg) saturate(.85) brightness(.8)' : undefined }} draggable={false} />
      {avatar ? (
        <div className="absolute" style={{ left: (size - fw) / 2, top: 0 }}><RingAvatar avatar={avatar} gioi={gioi} id={id} size={fw} /></div>
      ) : (
        <img src={nu ? s.art.female : s.art.male} className="absolute" style={{ left: (size - fw) / 2, top: 0, width: fw, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.35))' }} draggable={false} />
      )}
      {right && <div className="absolute rounded-full" style={{ left: (size - fw) / 2, top: 0, width: fw, height: shown, boxShadow: '0 0 0 4px #9dffb3, 0 0 20px #9dffb3' }} />}
      {crown && <div className="absolute left-1/2 -translate-x-1/2 leading-none" style={{ top: -size * 0.16, fontSize: size * 0.24 }}>{crown}</div>}
      {out && <div className="absolute inset-x-0 flex items-center justify-center font-extrabold" style={{ top: shown * 0.2, color: '#ff5a4d', fontSize: size * 0.5, lineHeight: 1 }}>✕</div>}
      <AnimatePresence>
        {!!gain && (
          <motion.div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-extrabold" style={{ top: -size * 0.34, fontSize: Math.max(22, size * 0.24), color: gain > 0 ? '#7dff9a' : '#ff8a80', textShadow: '0 2px 4px #000' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -6 }} exit={{ opacity: 0 }}>
            {gain > 0 ? `+${gain}` : gain}
          </motion.div>
        )}
      </AnimatePresence>
      {ten && (
        <div className="absolute flex items-center justify-center gap-1 whitespace-nowrap font-bold leading-none" style={{ left: 0, right: 0, top: size * 0.53, fontSize: font, color: crown ? '#ffe27a' : '#fff', textShadow: '0 1px 3px #000, 0 0 6px rgba(20,0,30,.9)' }}>
          <span className="truncate" style={{ maxWidth: size * 0.95 }}>{[...name].slice(0, size > 130 ? 14 : 11).join('')}</span>
          {!!score && <span style={{ color: GREEN }}>{score}</span>}
        </div>
      )}
    </motion.div>
  );
}

export const VUA_KHAN_DAI_KIT: Kit = { Scene, Header, Host, QuestionSign, GongClock, AnswerFrame, StatusLine, Rules, Mat, Seat, RingAvatar, NamePlate, GiftBoard };
