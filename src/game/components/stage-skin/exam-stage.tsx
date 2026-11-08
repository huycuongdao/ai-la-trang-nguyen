import { AnimatePresence, motion } from 'motion/react';
import type { GameState } from '../../hooks/useGame';
import type { View } from '../../engine/exam';
import { isElimView } from '../../engine/view-types';
import { GAME } from '../../config';
import { BangNho, BangQua, BangVang, CuuTro, DongNhac, PhaoGiay } from '../GameStage';
import { AnswerFrame, GongClock, Host, Mat, NamePlate, QuestionSign, Scene, Seat, layoutSeats, moodOf } from './kit';
import { useSkin } from './skin';
import { GiftBoard, PlateBox } from './panels';

/**
 * Màn hình live của chế độ thi, chủ đề "Đình làng": ông đồ đứng trước đình, biển câu hỏi treo giữa đình,
 * đồng hồ chiêng bên phải, 4 ô đáp án, sĩ tử ngồi trên chiếu. Bảng vàng lớn / vinh quy vẫn là tờ giấy dó phủ giữa sân.
 */
const MAX_SEATS = 12; // chỗ ngồi trên chiếu (tên còn đọc được); người ngoài chiếu vẫn tính điểm và hiện ở bảng vàng
const BUCKET = [4, 8, 12];
const bucket = (n: number) => BUCKET.find((b) => n <= b) ?? n;

export function ExamStageSkinned({ game }: { game: GameState }) {
  const { colors: C } = useSkin();
  const v = game.view;
  const skin = useSkin();
  if (!v || isElimView(v)) return <div className="absolute inset-0" />;
  const bigBoard = v.phase === 'bangVang' || v.phase === 'vinhQuy';
  const { status: st, leaderboard: lb } = skin.layout;
  const status = { left: st.x, top: st.y, width: st.w };
  return (
    <div className="absolute inset-0 select-none" style={{ color: C.cream }}>
      <Scene />
      <Header v={v} />
      {!bigBoard && <BangNho v={v} pos={{ left: lb.x, top: lb.y, width: lb.w, height: lb.h }} />}
      {!bigBoard && <GiftBoard />}
      <Host mood={moodOf(v)} ten={game.caiDat.tenOngDo} />
      {!bigBoard && <Question v={v} />}
      {!bigBoard && <Clock v={v} />}
      {!bigBoard && <Answers v={v} />}
      {!bigBoard && (v.cuu && !v.ketQua ? <CuuTro v={v} box={status} /> : <DongNhac v={v} box={status} />)}
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

/** Hai bên biển tên: câu số mấy + 4 kỳ thi, và tên kỳ thi / lật kèo */
function Header({ v }: { v: View }) {
  const { colors: C } = useSkin();
  const { pills } = useSkin().layout.sideSigns;
  return (
    <>
      <PlateBox side="left">
        <span className="text-[26px] font-extrabold" style={{ color: C.ink }}>{v.phase === 'cho' ? 'ĐỢI VÁN MỚI' : `CÂU ${Math.min(v.cauSo, v.tongCau)}/${v.tongCau}`}</span>
      </PlateBox>
      <span className="absolute flex gap-1.5" style={{ left: pills.x, top: pills.y }}>
        {GAME.vong.map((_, i) => (
          <span key={i} className="h-4 w-11 rounded-full border-2 border-[#3a0d05]" style={{ background: v.phase === 'cho' ? '#6b5236' : i < v.vong ? '#c8102e' : i === v.vong ? C.gold : '#6b5236' }} />
        ))}
      </span>
      <PlateBox side="right" gold={v.latKeo}>
        <span className={`${v.vongNhan.length > 9 ? 'text-[20px]' : 'text-[24px]'} whitespace-nowrap font-extrabold`} style={{ color: v.latKeo ? '#7a1208' : C.ink }}>
          {v.phase === 'cho' ? 'SẮP THI' : v.latKeo ? 'LẬT KÈO ×2' : v.vongNhan}
        </span>
      </PlateBox>
    </>
  );
}

/** Câu hỏi trên biển treo giữa đình (hoặc màn chờ / giới thiệu kỳ thi) */
function Question({ v }: { v: View }) {
  const { colors: C } = useSkin();
  const stamp = useSkin().layout.stamp;
  return (
    <>
      <QuestionSign>
        {v.phase === 'cho' ? (
          <>
            <div className="text-[34px] font-extrabold leading-tight" style={{ color: C.accent }}>Ván mới sau {v.con} giây</div>
            <div className="mt-1 text-[22px] font-semibold leading-snug">4 kỳ thi · 20 câu · gõ A, B, C, D · gõ Bắc, Trung, Nam thi đua 3 miền</div>
          </>
        ) : v.phase === 'vong' ? (
          <motion.div key={v.vongTen} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="flex flex-col items-center">
            <div className="text-[20px] font-bold opacity-80">Kỳ thi {v.vong + 1} / 4</div>
            <div className="text-[44px] font-extrabold leading-none" style={{ color: C.accent }}>{v.vongTen}</div>
            <div className="mt-1 text-[21px] font-semibold">
              {v.vongInfo.cau} câu · {v.vongInfo.giay} giây · đúng tới <b style={{ color: '#1e6b2a' }}>+{v.vongInfo.diem}</b> · sai <b style={{ color: '#b3200c' }}>−{v.vongInfo.tru}</b>
            </div>
          </motion.div>
        ) : (
          <>
            <div className={`${v.q.length > 90 ? 'text-[28px]' : v.q.length > 55 ? 'text-[32px]' : 'text-[39px]'} font-extrabold leading-snug`}>{v.q}</div>
            {v.phase === 'doc' && <div className="mt-0.5 text-[20px] font-semibold opacity-70">Nghe ông đồ đọc đề…</div>}
          </>
        )}
      </QuestionSign>
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
  const show = v.phase === 'hoi';
  return <GongClock value={show ? v.con : null} low={show && v.con <= 5} />;
}

/** 4 ô đáp án. Đang hỏi không hiện tỉ lệ (tránh người vào sau chép theo số đông). */
function Answers({ v }: { v: View }) {
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
          <AnswerFrame key={`${v.cauSo}-${i}`} index={i} delay={text && v.phase === 'hoi' ? i * 0.08 : 0} state={{ right, dim, wiped }}>
            <div className="flex items-center gap-2">
              <span className={`${(text?.length ?? 0) > 16 ? 'text-[25px]' : 'text-[31px]'} min-w-0 flex-1 truncate font-extrabold ${wiped ? 'line-through opacity-50' : ''}`}>{text ?? '…'}</span>
              {wiped && <span className="text-[24px]">✂️</span>}
              {v.counts && <span className="shrink-0 text-[21px] font-bold">{pct}%</span>}
            </div>
            {v.counts && (
              <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
                <motion.div className="h-full rounded-full" style={{ background: right ? '#1e8a3a' : '#c8102e' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 1.6 }} />
              </div>
            )}
          </AnswerFrame>
        );
      })}
    </>
  );
}

/** Sĩ tử ngồi trên chiếu: điểm cao ngồi trước. Quá chỗ thì ghi số người còn lại. */
function Seats({ v }: { v: View }) {
  const { colors: C } = useSkin();
  const lo = v.phase === 'dapAn';
  const list = v.ghe.slice(0, MAX_SEATS);
  const skin = useSkin();
  const size = layoutSeats(skin, bucket(Math.max(list.length, 1))).size;
  const seats = layoutSeats(skin, Math.max(list.length, 1), size);
  const more = v.soSiTu - list.length;
  return (
    <Mat>
      <AnimatePresence>
        {list.map((h, i) => {
          const p = seats.pos[i];
          if (!p) return null;
          const top3 = h.hang <= 3 && h.diem > 0;
          return (
            <Seat
              key={h.id} id={h.id} name={h.name} avatar={h.avatar} gioi={h.gioi} size={seats.size} ten={seats.ten} x={p.x} y={p.y}
              crown={top3 ? ['👑', '🥈', '🥉'][h.hang - 1] : undefined} gain={lo ? h.gain : 0} jump={lo && h.gain > 0}
            />
          );
        })}
      </AnimatePresence>
      {list.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <NamePlate name="Chiếu còn trống" w={380} />
          <div className="rounded-full px-5 text-[28px] font-extrabold leading-[44px]" style={{ background: C.panel }}>Gõ A, B, C hoặc D để ngồi vào</div>
        </div>
      )}
      {more > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 text-[22px] font-bold leading-[34px]" style={{ background: C.panel, zIndex: 2000 }}>
          + {more} sĩ tử khác đang thi
        </div>
      )}
    </Mat>
  );
}

