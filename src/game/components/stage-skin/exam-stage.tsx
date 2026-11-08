import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { GameState } from '../../hooks/useGame';
import type { View } from '../../engine/exam';
import { isElimView } from '../../engine/view-types';
import { GAME } from '../../config';
import { BangNho, BangQua, BangVang, CuuTro, PhaoGiay, statusText } from '../GameStage';
import { layoutSeats, moodOf } from './common';
import { useSkin } from './skin';

/**
 * Màn hình live của chế độ thi, chủ đề "Đình làng": ông đồ đứng trước đình, biển câu hỏi treo giữa đình,
 * đồng hồ chiêng bên phải, 4 ô đáp án, sĩ tử ngồi trên chiếu. Bảng vàng lớn / vinh quy vẫn là tờ giấy dó phủ giữa sân.
 */
const BUCKET = [4, 8, 12, 24, 36, 45]; // cỡ chỗ ngồi chỉ đổi khi số người vượt mốc, đỡ nhảy lung tung
const bucket = (n: number) => BUCKET.find((b) => n <= b) ?? n;

export function ExamStageSkinned({ game }: { game: GameState }) {
  const skin = useSkin();
  const { colors: C, kit: K } = skin;
  const v = game.view;
  if (!v || isElimView(v)) return <div className="absolute inset-0" />;
  const bigBoard = v.phase === 'bangVang' || v.phase === 'vinhQuy';
  const { status: st, leaderboard: lb } = skin.layout;
  const status = { left: st.x, top: st.y, width: st.w };
  return (
    <div className="absolute inset-0 select-none" style={{ color: C.cream, '--stage-gold': C.gold, '--stage-cream': C.cream, '--stage-panel': C.panel } as CSSProperties}>
      <K.Scene />
      <HeaderBar v={v} />
      {!bigBoard && !skin.hide?.leaderboard && <BangNho v={v} pos={{ left: lb.x, top: lb.y, width: lb.w, height: lb.h }} />}
      {!bigBoard && !skin.hide?.gift && <K.GiftBoard />}
      <K.Host mood={moodOf(v)} ten={game.caiDat.tenOngDo} />
      {!bigBoard && <Question v={v} />}
      {!bigBoard && <Clock v={v} />}
      {!bigBoard && <Answers v={v} />}
      {!bigBoard && (v.cuu && !v.ketQua ? <CuuTro v={v} box={status} /> : <K.StatusLine>{statusText(v)}</K.StatusLine>)}
      {!bigBoard && K.Rules && <K.Rules title={GAME.text.rulesTitle} lines={GAME.text.rulesExam} />}
      <Seats v={v} />

      {bigBoard && (
        <div className="absolute inset-0" style={{ zIndex: 2000 }}>
          <div className="absolute overflow-hidden rounded-[14px] border-4" style={{ left: 60, top: 120, width: 960, height: 1340, borderColor: C.gold, background: 'radial-gradient(ellipse at 50% 40%,#fbf0d6 0%,#f3e2bb 75%,#ead39f 100%)' }} />
          <BangVang v={v} />
        </div>
      )}
      {(v.phase === 'vinhQuy' || v.qua?.big) && <PhaoGiay />}
      <BangQua v={v} />
    </div>
  );
}

/** Câu số mấy, tên kỳ thi / lật kèo, 4 kỳ thi (kit vẽ thành các biển, thanh trạng thái...) */
function HeaderBar({ v }: { v: View }) {
  const { kit: K } = useSkin();
  return (
    <K.Header
      main={v.phase === 'cho' ? 'ĐỢI VÁN MỚI' : `CÂU ${Math.min(v.cauSo, v.tongCau)}`}
      total={v.phase === 'cho' ? undefined : String(v.tongCau)}
      label={v.phase === 'cho' ? 'SẮP THI' : v.latKeo ? 'LẬT KÈO ×2' : v.vongNhan}
      gold={v.latKeo}
      rounds={GAME.vong.map((_, i) => (v.phase === 'cho' ? 'todo' : i < v.vong ? 'done' : i === v.vong ? 'now' : 'todo'))}
    />
  );
}

/** Câu hỏi trên biển treo giữa đình (hoặc màn chờ / giới thiệu kỳ thi) */
function Question({ v }: { v: View }) {
  const { colors: C, kit: K } = useSkin();
  const stamp = useSkin().layout.stamp;
  return (
    <>
      <K.QuestionSign>
        {v.phase === 'cho' ? (
          <>
            <div className="text-[34px] font-extrabold leading-tight" style={{ color: C.accent }}>Ván mới sau {v.con} giây</div>
            <div className="mt-1 text-[22px] font-semibold leading-snug">{GAME.text.intro}</div>
          </>
        ) : v.phase === 'vong' ? (
          <motion.div key={v.vongTen} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="flex flex-col items-center">
            <div className="text-[20px] font-bold opacity-80">{GAME.text.round} {v.vong + 1} / 4</div>
            <div className="text-[44px] font-extrabold leading-none" style={{ color: C.accent }}>{v.vongTen}</div>
            <div className="mt-1 text-[21px] font-semibold">
              {v.vongInfo.cau} câu · {v.vongInfo.giay} giây · đúng tới <b style={{ color: C.good }}>+{v.vongInfo.diem}</b> · sai <b style={{ color: C.bad }}>−{v.vongInfo.tru}</b>
            </div>
          </motion.div>
        ) : (
          <>
            <div className={`${v.q.length > 90 ? 'text-[28px]' : v.q.length > 55 ? 'text-[32px]' : 'text-[39px]'} font-extrabold leading-snug`}>{v.q}</div>
            {v.phase === 'doc' && <div className="mt-0.5 text-[20px] font-semibold opacity-70">{GAME.text.hostReading}</div>}
          </>
        )}
      </K.QuestionSign>
      <AnimatePresence>
        {v.phase === 'chot' && (
          <motion.div
            key={`chot-${v.cauSo}`}
            initial={{ scale: 2.6, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            className="absolute flex items-center justify-center rounded-[16px] border-[7px] text-[60px] font-extrabold tracking-wider"
            style={{ left: stamp.x, top: stamp.y, width: stamp.w, height: stamp.h, zIndex: 40, borderColor: '#c8102e', color: '#c8102e', background: 'rgba(255,243,214,.96)', boxShadow: '0 8px 30px rgba(0,0,0,.45)' }}
          >
            HẾT GIỜ!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Clock({ v }: { v: View }) {
  const { kit: K } = useSkin();
  const show = v.phase === 'hoi';
  return <K.GongClock value={show ? v.con : null} total={v.tongGiay} low={show && v.con <= 5} />;
}

/** 4 ô đáp án. Đang hỏi không hiện tỉ lệ (tránh người vào sau chép theo số đông). */
function Answers({ v }: { v: View }) {
  const { colors: C, kit: K } = useSkin();
  if (v.phase === 'cho' || v.phase === 'vong') return null;
  const total = v.counts ? v.counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const text = v.opts[i];
        const right = v.dung === i;
        const wiped = !!v.cuu?.loai.includes(i);
        const pct = v.counts && total ? Math.round((v.counts[i] / total) * 100) : 0;
        const dim = (v.dung >= 0 && !right) || wiped;
        return (
          <K.AnswerFrame key={`${v.cauSo}-${i}`} len={text?.length ?? 0} index={i} delay={text && v.phase === 'hoi' ? i * 0.08 : 0} state={{ right, dim, wiped }}>
            <div className="flex items-center gap-2">
              <span className={`${(text?.length ?? 0) > 16 ? 'text-[25px]' : 'text-[31px]'} min-w-0 flex-1 truncate font-extrabold ${wiped ? 'line-through opacity-50' : ''}`}>{text ?? '…'}</span>
              {wiped && <span className="text-[24px]">✂️</span>}
              {v.counts && <span className="shrink-0 text-[21px] font-bold">{pct}%</span>}
            </div>
            {v.counts && (
              <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
                <motion.div className="h-full rounded-full" style={{ background: right ? C.good : C.bad }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 1.6 }} />
              </div>
            )}
          </K.AnswerFrame>
        );
      })}
    </>
  );
}

/** Sĩ tử ngồi trên chiếu: điểm cao ngồi trước. Quá chỗ thì ghi số người còn lại. */
function Seats({ v }: { v: View }) {
  const skin = useSkin();
  const { colors: C, kit: K } = skin;
  const lo = v.phase === 'dapAn';
  const list = v.ghe.slice(0, skin.maxSeats);
  const size = layoutSeats(skin, bucket(Math.max(list.length, 1))).size;
  const seats = layoutSeats(skin, Math.max(list.length, 1), size);
  const more = v.soSiTu - list.length;
  return (
    <K.Mat>
      <AnimatePresence>
        {list.map((h, i) => {
          const p = seats.pos[i];
          if (!p) return null;
          const top3 = h.hang <= 3 && h.diem > 0;
          return (
            <K.Seat
              key={h.id} id={h.id} name={h.name} avatar={h.avatar} gioi={h.gioi} size={seats.size} ten={seats.ten} x={p.x} y={p.y}
              crown={top3 ? ['👑', '🥈', '🥉'][h.hang - 1] : undefined} score={h.diem} gain={lo ? h.gain : 0} jump={lo && h.gain > 0}
            />
          );
        })}
      </AnimatePresence>
      {list.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <K.NamePlate name={GAME.text.seatEmpty} w={380} />
          <div className="rounded-full px-5 text-[28px] font-extrabold leading-[44px]" style={{ background: C.panel }}>{GAME.text.seatJoin}</div>
        </div>
      )}
      {more > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 text-[22px] font-bold leading-[34px]" style={{ background: C.panel, zIndex: 2000 }}>
          + {more} {GAME.text.player} khác đang thi
        </div>
      )}
    </K.Mat>
  );
}

