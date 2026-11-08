import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { GameState } from '../../hooks/useGame';
import type { ElimView } from '../../engine/elimination';
import { isElimView } from '../../engine/view-types';
import { GAME } from '../../config';
import { LOAI } from '../../elimination-config';
import { BangQua, PhaoGiay } from '../GameStage';
import { layoutSeats, moodOf } from './common';
import { useSkin } from './skin';

/**
 * Màn hình live của chế độ loại trực tiếp, chủ đề "Đình làng": mọi người ngồi trên chiếu trước đình,
 * sai thì bị loại (ảnh xám, gạch chéo). Còn ít người thì hiện bảng top. Bố cục giống chế độ thi để người xem quen mắt.
 */
const BUCKETS = [8, 15, 24, 35, 48, 63, 80, 100, 130];
const bucket = (n: number) => BUCKETS.find((b) => n <= b) ?? n;
const TB = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')}s`);

export function EliminationStageSkinned({ game }: { game: GameState }) {
  const skin = useSkin();
  const { colors: C, kit: K } = skin;
  const v = game.view;
  if (!v || !isElimView(v)) return <div className="absolute inset-0" />;
  const win = v.phase === 'vinhDanh';
  return (
    <div className="absolute inset-0 select-none" style={{ color: C.cream, '--stage-gold': C.gold, '--stage-cream': C.cream, '--stage-panel': C.panel } as CSSProperties}>
      <K.Scene />
      {!win && !skin.hide?.counter && <Counter v={v} />}
      <K.Header main={v.phase === 'cho' ? 'GHI TÊN' : win ? 'KẾT THÚC' : `CÂU ${v.cauSo}`} total={v.phase === 'cho' || win ? undefined : String(v.tongCau)} label={LOAI.title} detail={v.phase === 'cho' ? `ĐÃ GHI TÊN ${v.soNguoi}/${v.maxNguoi}` : win ? undefined : `CÒN LẠI ${v.conLai}/${v.soNguoi}`} />
      {!win && K.Rules && <K.Rules title={GAME.text.rulesTitle} lines={GAME.text.rulesElim} />}
      {!win && !skin.hide?.gift && <K.GiftBoard />}
      <K.Host mood={moodOf(v)} ten={game.caiDat.tenOngDo} />
      {!win && <Question v={v} />}
      {!win && <Clock v={v} />}
      {!win && v.phase !== 'cho' && <Answers v={v} />}
      {!win && <Ticker v={v} />}
      {!win && <Floor v={v} />}
      {win && <Winner v={v} />}
      {win && <PhaoGiay />}
      <BangQua v={v} />
    </div>
  );
}

/** Bảng gỗ to: số người còn lại (hoặc đã ghi tên) là con số chính của chế độ này */
function Counter({ v }: { v: ElimView }) {
  const { colors: C } = useSkin();
  const ct = useSkin().layout.counter;
  const cho = v.phase === 'cho';
  const so = cho ? v.soNguoi : v.conLai;
  const tong = cho ? v.maxNguoi : v.soNguoi;
  const ti = tong > 0 ? Math.min(1, so / tong) : 0;
  const danger = !cho && so > 0 && ti <= 0.2;
  return (
    <div className="absolute flex flex-col items-center justify-center rounded-[22px]" style={{
      left: ct.x, top: ct.y, width: ct.w, height: ct.h, border: `5px double ${C.gold}`, outline: '2px solid #3a0d05',
      background: 'linear-gradient(#8a2a14,#4f1309)', boxShadow: '0 10px 26px rgba(0,0,0,.55), inset 0 0 22px rgba(255,200,90,.25)',
    }}>
      <div className="text-[22px] font-extrabold leading-none tracking-[0.18em]" style={{ color: '#f3c97a' }}>{LOAI.title.toUpperCase()}</div>
      <div className="mt-1 flex items-baseline justify-center gap-2 leading-none">
        <motion.span key={so} initial={{ scale: 1.45, color: '#ffffff' }} animate={{ scale: 1, color: danger ? '#ff8a7a' : '#ffd977' }} transition={{ type: 'spring', stiffness: 420, damping: 15 }} className="text-[112px] font-extrabold tabular-nums" style={{ textShadow: '0 5px 0 #3a0d05' }}>
          {so}
        </motion.span>
        <span className="text-[46px] font-bold tabular-nums opacity-80" style={{ color: C.cream }}>/ {tong}</span>
      </div>
      <div className="text-[26px] font-extrabold leading-none tracking-wider">{cho ? `${GAME.text.player.toUpperCase()} ĐÃ GHI TÊN` : `${GAME.text.player.toUpperCase()} CÒN LẠI`}</div>
      <div className="mt-2 h-[10px] w-[340px] overflow-hidden rounded-full bg-black/50">
        <motion.div className="h-full rounded-full" style={{ background: danger ? 'linear-gradient(90deg,#ff5a4d,#ffb199)' : 'linear-gradient(90deg,#ffd34d,#fff0a8)' }} animate={{ width: `${ti * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

/** Câu hỏi trên biển treo giữa đình; lúc chờ ván thì hướng dẫn vào chơi */
function Question({ v }: { v: ElimView }) {
  const { colors: C, kit: K } = useSkin();
  const stamp = useSkin().layout.stamp;
  const c = v.cong;
  return (
    <>
      <K.QuestionSign>
        {v.phase === 'cho' ? (
          c ? (
            <>
              <div className="text-[32px] font-extrabold leading-tight" style={{ color: C.accent }}>Thả tim để mở ván mới</div>
              <div className="mt-1 flex w-[500px] items-center gap-3">
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-black/25">
                  <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#c8102e,#ff6f91)' }} animate={{ width: `${(c.tim / c.can) * 100}%` }} />
                </div>
                <span className="text-[24px] font-bold tabular-nums">❤️ {c.tim}/{c.can}</span>
              </div>
              <div className="mt-1 text-[20px] font-semibold leading-snug">hoặc tự mở sau {c.con} giây · gõ A, B, C hoặc D để ghi tên</div>
            </>
          ) : (
            <>
              <div className="text-[30px] font-extrabold leading-tight" style={{ color: C.accent }}>{GAME.text.elimJoinTitle(v.con)}</div>
              <div className="mt-1 text-[21px] font-semibold leading-snug">
                {GAME.text.elimJoinHow}<br />Mỗi câu {v.tongGiay} giây · sai hoặc bỏ trống là bị loại · không ai đúng thì không ai bị loại
              </div>
            </>
          )
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

/** Đồng hồ chiêng; lúc công bố hiện số người vừa bị loại */
function Clock({ v }: { v: ElimView }) {
  const { kit: K } = useSkin();
  const badge = useSkin().layout.outBadge;
  const show = v.phase === 'hoi';
  const out = v.phase === 'dapAn' ? v.ghe.filter((h) => !h.alive).length : 0;
  return (
    <>
      <K.GongClock value={show ? v.con : null} total={v.tongGiay} low={show && v.con <= 2} />
      <AnimatePresence>
        {out > 0 && (
          <motion.div
            key={`out-${v.cauSo}`}
            initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 380, damping: 15 }}
            className="absolute flex items-center justify-center whitespace-nowrap rounded-[18px] border-[5px] px-4 text-[60px] font-extrabold leading-none"
            style={{ left: badge.x, top: badge.y, height: badge.h, zIndex: 40, borderColor: '#fff3c4', background: 'linear-gradient(#d4281a,#8f1208)', color: '#fff3c4', boxShadow: '0 8px 22px rgba(0,0,0,.55)' }}
          >
            −{out} ✕
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Answers({ v }: { v: ElimView }) {
  const { kit: K } = useSkin();
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const text = v.opts[i];
        const right = v.dung === i;
        return (
          <K.AnswerFrame key={`${v.cauSo}-${i}`} len={text?.length ?? 0} index={i} delay={text && v.phase === 'hoi' ? i * 0.05 : 0} state={{ right, dim: v.dung >= 0 && !right, wiped: false }}>
            <span className={`${(text?.length ?? 0) > 13 ? 'text-[25px]' : 'text-[31px]'} line-clamp-2 font-extrabold leading-tight`}>{text ?? '…'}</span>
          </K.AnswerFrame>
        );
      })}
    </>
  );
}

/** Dòng tin giữa 4 đáp án và chiếu: ai đã nộp, kết quả vừa công bố, hoặc ai vừa ghi tên */
function Ticker({ v }: { v: ElimView }) {
  const { kit: K } = useSkin();
  const kq = v.ketQua;
  const fresh = v.ghe.slice(-2).map((h) => h.name).join(', ');
  const text =
    v.phase === 'dapAn' && kq
      ? v.khongAiDung ? '😮 Không ai đúng, không ai bị loại' : `✅ ${kq.soDung} đúng · ✕ ${v.ghe.filter((h) => !h.alive).length} bị loại · còn ${v.conLai}`
      : v.phase === 'hoi' || v.phase === 'chot' ? `📜 ${v.soNop}/${v.conLai} đã nộp`
      : v.phase === 'cho' ? (fresh ? `🆕 Mới vào: ${fresh}` : 'Gõ A, B, C hoặc D để ghi tên')
      : '';
  if (!text) return null;
  return <K.StatusLine>{text}</K.StatusLine>;
}

// ---------------- chiếu và chỗ ngồi ----------------

function Floor({ v }: { v: ElimView }) {
  const { kit: K } = useSkin();
  const top = v.phase !== 'vinhDanh' && v.top.length > 0;
  return <K.Mat>{top ? <TopBoard v={v} /> : <Seats v={v} />}</K.Mat>;
}

function Seats({ v }: { v: ElimView }) {
  const { colors: C, kit: K } = useSkin();
  const dapAn = v.phase === 'dapAn';
  const skin = useSkin();
  const size = layoutSeats(skin, bucket(Math.max(v.ghe.length, 1))).size;
  const seats = layoutSeats(skin, Math.max(v.ghe.length, 1), size);
  return (
    <>
      <AnimatePresence>
        {v.ghe.map((h, i) => {
          const p = seats.pos[i];
          return p ? <K.Seat key={h.id} id={h.id} name={h.name} avatar={h.avatar} size={seats.size} ten={seats.ten} x={p.x} y={p.y} out={!h.alive} right={dapAn && h.dung} /> : null;
        })}
      </AnimatePresence>
      {v.ghe.length === 0 && v.phase === 'cho' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="flex gap-5">
            {['A', 'B', 'C', 'D'].map((l, i) => (
              <motion.div key={l} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }} className="flex h-[104px] w-[104px] items-center justify-center rounded-full border-[6px] text-[66px] font-extrabold" style={{ borderColor: C.gold, background: 'rgba(58,13,5,.75)', color: '#ffe9a8', boxShadow: '0 6px 0 #3a0d05' }}>
                {l}
              </motion.div>
            ))}
          </div>
          <div className="rounded-[18px] px-6 py-1 text-center text-[38px] font-extrabold leading-tight" style={{ background: C.panel, color: '#ffe9a8' }}>{GAME.text.seatEmpty}<br />{GAME.text.seatJoinOne}</div>
        </div>
      )}
    </>
  );
}

/** Còn từ 5 người trở xuống: thẻ từng người với số bình chọn và thời gian trung bình */
function TopBoard({ v }: { v: ElimView }) {
  const { colors: C, kit: K } = useSkin();
  const right = new Set(v.ghe.filter((h) => h.dung).map((h) => h.id));
  const topIds = new Set(v.top.map((u) => u.id));
  const justOut = v.ghe.filter((h) => !h.alive && !topIds.has(h.id));
  const n = Math.max(v.top.length, 3);
  const w = Math.min(190, (useSkin().layout.mat.w - 160 - 12 * (n - 1)) / n);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-[70px]" style={{ zIndex: 50 }}>
      <div className="rounded-full px-5 text-[34px] font-extrabold leading-[48px]" style={{ background: C.panel, color: '#ffe27a' }}>🔥 CHỈ CÒN {v.top.length} NGƯỜI</div>
      <div className="mt-5 flex w-full justify-center gap-3">
        <AnimatePresence>
          {v.top.map((u) => (
            <motion.div
              key={u.id} layout
              initial={{ opacity: 0, y: 40, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative flex flex-col items-center rounded-[16px] border-[3px] px-1 pb-2 pt-5"
              style={{ width: w, borderColor: right.has(u.id) ? '#9dffb3' : C.gold, background: C.panel, boxShadow: right.has(u.id) ? '0 0 24px rgba(157,255,179,.8)' : undefined }}
            >
              <div className="absolute -top-5 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border-[3px] text-[28px] font-extrabold" style={{ background: 'linear-gradient(#ffd34d,#e8a33d)', borderColor: '#fff3c4', color: C.ink }}>{u.so}</div>
              <K.RingAvatar avatar={u.avatar} id={u.id} size={Math.min(110, w - 16)} />
              <div className="mt-1 w-full truncate text-center text-[24px] font-extrabold leading-tight">{u.name}</div>
              <div className="text-[34px] font-extrabold leading-tight tabular-nums" style={{ color: '#9dffb3' }}>{TB(u.avgMs)}</div>
              {v.binhChon && <div className="text-[26px] font-extrabold leading-tight tabular-nums">🌹 {u.phieu}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {v.binhChon && (
        <div className="mt-3 rounded-[14px] border-2 px-4 py-1 text-center text-[21px] font-bold leading-snug" style={{ borderColor: C.gold, background: C.panel }}>
          {GAME.text.elimVote}
          {v.yeuNhat && <div className="text-[20px]" style={{ color: '#ffe27a' }}>Được yêu quý nhất: {v.yeuNhat.name} · {v.yeuNhat.phieu} phiếu</div>}
        </div>
      )}
      {justOut.length > 0 && <div className="mt-2 max-w-full truncate text-[20px] font-semibold" style={{ color: C.cream }}>✕ Vừa bị loại: {justOut.map((h) => h.name).join(', ')}</div>}
    </div>
  );
}

// ---------------- người thắng ----------------

function Winner({ v }: { v: ElimView }) {
  const { colors: C, kit: K } = useSkin();
  const w = v.thang;
  return (
    <div className="absolute inset-0" style={{ zIndex: 2000 }}>
      <div className="absolute overflow-hidden rounded-[14px] border-4" style={{ left: 60, top: 330, width: 960, height: 1310, borderColor: C.gold, background: 'radial-gradient(ellipse at 50% 40%,#fbf0d6 0%,#f3e2bb 75%,#ead39f 100%)' }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.4 }}
        className="absolute flex flex-col items-center justify-center text-center" style={{ left: 60, top: 330, width: 960, height: 1310, color: '#8a1c0c' }}
      >
        <div className="text-[48px] font-extrabold">🏆 NGƯỜI ĐỨNG VỮNG CUỐI CÙNG</div>
        {w ? (
          <>
            <div className="mt-6" style={{ filter: 'drop-shadow(0 0 40px rgba(255,211,77,.95))' }}>
              <K.RingAvatar avatar={w.avatar} id={w.id} size={380} />
            </div>
            <div className="mt-4 max-w-[880px] truncate text-[84px] font-extrabold leading-tight">{w.name}</div>
            <div className="mt-2 text-[40px] font-bold" style={{ color: '#4a1a0c' }}>Trả lời trung bình {TB(w.avgMs)} mỗi câu</div>
            <div className="mt-1 text-[32px] font-semibold" style={{ color: '#4a1a0c' }}>trong số {v.soNguoi} {GAME.text.player}</div>
          </>
        ) : (
          <div className="mt-24 text-[44px] font-bold">Chưa có ai ghi tên</div>
        )}
        {v.yeuNhat && (
          <div className="mt-8 rounded-full border-4 px-8 py-2 text-[34px] font-extrabold" style={{ borderColor: C.gold, background: 'rgba(138,28,12,.92)', color: '#ffe9a8' }}>
            🌹 Được yêu quý nhất: {v.yeuNhat.name} · {v.yeuNhat.phieu} phiếu
          </div>
        )}
      </motion.div>
    </div>
  );
}
