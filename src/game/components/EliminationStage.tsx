import { AnimatePresence, motion } from 'motion/react';
import type { GameState } from '../hooks/useGame';
import type { ElimView } from '../engine/elimination';
import { isElimView } from '../engine/view-types';
import { LOAI } from '../elimination-config';
import { Avatar, BangQua, MC, PhaoGiay, TenGame } from './GameStage';

/**
 * Màn hình live 1080x1920 của chế độ loại trực tiếp: chiếu đỏ trải giữa sân, cờ treo xung quanh, mỗi người ngồi một chỗ.
 * Chừa 250px dưới cùng và mép phải cho giao diện TikTok. Ảnh nền ở một chỗ (NEN) để thay bằng ảnh đình làng của chủ kênh.
 */
const NEN = '/assets/background/village-yard.jpg';
const GOLD = '#d9a441';
const CREAM = '#fff1cc';
const PHAN = '#f5f1e6';
const PANEL = 'rgba(38,18,8,.80)';
const DO = '#da251d';

// Chiếu đỏ: vị trí và bề rộng trên màn hình. Nằm dưới 4 ô đáp án; đáy chiếu cách đáy màn 275px cho giao diện TikTok.
const CHIEU = { x: (1080 - 912) / 2, y: 1140, w: 912, h: 505 };
const LE = 22; // lề trong chiếu
/** Tâm ngang của bảng đen (mặt bảng x 216-862) */
const TAM_BANG = 539;

export function EliminationStage({ game }: { game: GameState }) {
  const v = game.view;
  if (!v || !isElimView(v)) return <div className="absolute inset-0" />;
  const thang = v.phase === 'vinhDanh';
  return (
    <div className="absolute inset-0 select-none" style={{ color: CREAM }}>
      <div className="absolute inset-0" style={{ background: `url(${NEN}) top center / 1080px 1920px no-repeat #1d0d0a` }} />
      <TenGame tieuDe={game.caiDat.tieuDe} />
      <CongSo v={v} />
      <Bang v={v} />
      <DongHo v={v} />
      <Nhan v={v} />
      {!thang && <Chieu v={v} />}
      {!thang && <MC v={v} ten={game.caiDat.tenOngDo} left={-6} top={520} height={400} />}
      {!thang && <DongTin v={v} />}
      {thang && <NguoiThang v={v} />}
      {thang && <PhaoGiay />}
      <BangQua v={v} />
    </div>
  );
}

// ---------------- cờ ----------------

function Co({ w, x, y, xoay = 0 }: { w: number; x: number; y: number; xoay?: number }) {
  return (
    <div className="absolute flex items-center justify-center" style={{ left: x, top: y, width: w, height: w * 0.66, background: DO, transform: `rotate(${xoay}deg)`, transformOrigin: 'top center', boxShadow: '0 3px 6px rgba(0,0,0,.4)' }}>
      <span style={{ color: '#ffff00', fontSize: w * 0.5, lineHeight: 1 }}>★</span>
    </div>
  );
}

/** Dây cờ treo phía trên chiếu */
function DayCo() {
  const n = 10;
  const dai = CHIEU.w - 40;
  return (
    <>
      <div className="absolute" style={{ left: CHIEU.x + 20, top: CHIEU.y - 48, width: dai, height: 3, background: '#3a2410' }} />
      {Array.from({ length: n }, (_, i) => (
        <Co key={i} w={52} x={CHIEU.x + 20 + (dai - 52) * (i / (n - 1))} y={CHIEU.y - 46} xoay={i % 2 ? 3 : -3} />
      ))}
    </>
  );
}

// ---------------- chiếu và chỗ ngồi ----------------

/** Số chỗ tính để chia lưới: làm tròn lên để lưới không đổi cỡ mỗi khi có thêm một người */
const BAC = [8, 15, 24, 35, 48, 63, 80, 100, 130];
const bac = (n: number) => BAC.find((b) => n <= b) ?? n;

/** Ảnh nhỏ hơn cỡ này thì không ghi tên: trên điện thoại chữ dưới 24px không đọc được, đám đông chỉ hiện ảnh */
const CO_TEN = 100;

/** Lưới chia chiếu cho n chỗ: chọn số cột cho ô to nhất; `ten` = đủ to để ghi tên dưới ảnh */
function luoi(n: number) {
  const W = CHIEU.w - 2 * LE;
  const H = CHIEU.h - 2 * LE;
  let best = { cols: 1, size: 0, cw: W, ch: H, ten: false };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = W / cols;
    const ch = H / rows;
    const coTen = Math.min(cw * 0.9, ch / 1.4, 150);
    const ten = coTen >= CO_TEN;
    const size = ten ? coTen : Math.min(cw * 0.9, ch / 1.08, 150);
    if (size > best.size) best = { cols, size, cw, ch, ten };
  }
  return best;
}

/** Chiếu chưa có ai: chỉ cách vào chơi bằng 4 chữ cái to */
function ChieuTrong() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="flex gap-6">
        {['A', 'B', 'C', 'D'].map((l, i) => (
          <motion.div
            key={l}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }}
            className="flex h-[118px] w-[118px] items-center justify-center rounded-full border-[6px] text-[76px] font-extrabold"
            style={{ borderColor: GOLD, background: 'rgba(58,13,5,.6)', color: '#ffe9a8', boxShadow: '0 6px 0 #3a0d05' }}
          >
            {l}
          </motion.div>
        ))}
      </div>
      <div className="px-10 text-center text-[46px] font-extrabold leading-tight" style={{ color: '#ffe9a8', textShadow: '0 3px 0 #3a0d05' }}>
        Chiếu còn trống<br />Gõ 1 chữ cái để ngồi vào
      </div>
    </div>
  );
}

type Ghe = ElimView['ghe'][number];

function Chieu({ v }: { v: ElimView }) {
  const top = v.phase !== 'vinhDanh' && v.top.length > 0;
  return (
    <>
      <DayCo />
      <div className="absolute overflow-hidden rounded-[18px]" style={{
        left: CHIEU.x, top: CHIEU.y, width: CHIEU.w, height: CHIEU.h, border: '8px solid #5a1409', outline: `3px solid ${GOLD}`,
        background: 'repeating-linear-gradient(90deg,rgba(0,0,0,.14) 0 3px,transparent 3px 16px),repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 2px,transparent 2px 12px),linear-gradient(#b3132a,#86101f)',
        boxShadow: '0 14px 30px rgba(0,0,0,.55), inset 0 0 40px rgba(0,0,0,.35)',
      }}>
        {top ? <BangTop v={v} /> : <CacChoNgoi ghe={v.ghe} dapAn={v.phase === 'dapAn'} />}
        {!top && v.ghe.length === 0 && v.phase === 'cho' && <ChieuTrong />}
      </div>
    </>
  );
}

function CacChoNgoi({ ghe, dapAn }: { ghe: Ghe[]; dapAn: boolean }) {
  const g = luoi(bac(Math.max(ghe.length, 1)));
  const rows = Math.ceil(ghe.length / g.cols);
  const lech = Math.max(0, (CHIEU.h - 2 * LE - rows * g.ch) / 2);
  const chu = Math.max(24, Math.round(g.size * 0.21));
  const soChu = g.size > 130 ? 14 : 11;
  return (
    <AnimatePresence>
      {ghe.map((h, i) => {
        const x = LE + (i % g.cols) * g.cw + (g.cw - g.size) / 2;
        const y = LE + lech + Math.floor(i / g.cols) * g.ch + (g.ch - g.size * (g.ten ? 1.35 : 1)) / 2;
        const loai = !h.alive;
        return (
          <motion.div
            key={h.id}
            className="absolute flex flex-col items-center"
            style={{ width: g.size, filter: loai ? 'grayscale(1)' : undefined }}
            initial={{ opacity: 0, scale: 0.3, left: x, top: y }}
            animate={{ opacity: loai ? 0.6 : 1, scale: 1, left: x, top: y }}
            exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
          >
            <div className="relative">
              <Avatar h={h} size={g.size} />
              {dapAn && h.dung && <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 4px #9dffb3, 0 0 18px #9dffb3' }} />}
              {loai && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 font-extrabold" style={{ color: '#ff5a4d', fontSize: g.size * 0.9, lineHeight: 1 }}>✕</div>
              )}
            </div>
            {g.ten && (
              <div className="mt-0.5 max-w-[150%] truncate whitespace-nowrap rounded-full px-1.5 font-bold" style={{ fontSize: chu, lineHeight: 1.3, background: 'rgba(30,14,6,.78)', color: CREAM }}>
                {[...h.name].slice(0, soChu).join('')}
              </div>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

// ---------------- còn từ 5 người trở xuống ----------------

const TB = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')}s`);

function BangTop({ v }: { v: ElimView }) {
  const dung = new Set(v.ghe.filter((h) => h.dung).map((h) => h.id));
  const topId = new Set(v.top.map((u) => u.id));
  const vuaLoai = v.ghe.filter((h) => !h.alive && !topId.has(h.id));
  // ít người thì thẻ to hơn; tối đa topN thẻ vừa một hàng
  const n = Math.max(v.top.length, 3);
  const w = Math.min(250, (CHIEU.w - 2 * LE - 12 * (n - 1)) / n);
  const to = w > 200;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-[22px] pb-1 pt-2">
      <div className="text-[38px] font-extrabold leading-none" style={{ color: '#ffe27a', textShadow: '0 3px 0 #3a0d05' }}>
        🔥 CHỈ CÒN {v.top.length} NGƯỜI
      </div>
      <div className="mt-6 flex w-full justify-center gap-3">
        <AnimatePresence>
          {v.top.map((u) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative flex flex-col items-center rounded-[16px] border-[3px] px-1 pb-3 pt-6"
              style={{ width: w, borderColor: dung.has(u.id) ? '#9dffb3' : GOLD, background: 'rgba(38,18,8,.72)', boxShadow: dung.has(u.id) ? '0 0 24px rgba(157,255,179,.8)' : undefined }}
            >
              <div className="absolute -top-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-[3px] text-[32px] font-extrabold" style={{ background: 'linear-gradient(#ffd34d,#e8a33d)', borderColor: '#fff3c4', color: '#4a1a0c' }}>{u.so}</div>
              <Avatar h={u} size={Math.min(to ? 130 : 96, w - 24)} />
              <div className={`mt-1 w-full truncate text-center ${to ? 'text-[30px]' : 'text-[26px]'} font-extrabold leading-tight`}>{u.name}</div>
              <div className={`${to ? 'text-[44px]' : 'text-[36px]'} font-extrabold leading-tight tabular-nums`} style={{ color: '#9dffb3' }}>{TB(u.avgMs)}</div>
              {v.binhChon && <div className={`${to ? 'text-[34px]' : 'text-[28px]'} font-extrabold leading-tight tabular-nums`}>🌹 {u.phieu}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {v.binhChon && (
        <div className="mt-3 rounded-[14px] border-2 px-4 py-1 text-center text-[24px] font-bold leading-snug" style={{ borderColor: GOLD, background: PANEL }}>
          Gõ số trên huy hiệu để chọn sĩ tử, rồi tặng hoa 🌹 hoặc bóng bay 🎈
          {v.yeuNhat && <div className="text-[22px]" style={{ color: '#ffe27a' }}>Được yêu quý nhất: {v.yeuNhat.name} · {v.yeuNhat.phieu} phiếu</div>}
        </div>
      )}
      {vuaLoai.length > 0 && (
        <div className="mt-2 max-w-full truncate text-[22px] font-semibold opacity-90">✕ Vừa bị loại: {vuaLoai.map((h) => h.name).join(', ')}</div>
      )}
    </div>
  );
}

// ---------------- bảng đen, đồng hồ, nhãn ----------------

/** Mặt bảng đen (x 216-862, y 517-835) chỉ dành cho câu hỏi; 4 đáp án nằm riêng bên dưới cho to và dễ đọc */
function Bang({ v }: { v: ElimView }) {
  const phan = { color: PHAN, textShadow: '0 0 2px rgba(255,255,255,.35)' };
  return (
    <>
      {v.phase === 'cho' || v.phase === 'vinhDanh' ? <BangCho v={v} /> : (
        <div className="absolute flex flex-col items-center justify-center px-2 text-center" style={{ left: 252, top: 528, width: 594, height: 300, ...phan }}>
          <div className={`${v.q.length > 90 ? 'text-[40px]' : v.q.length > 55 ? 'text-[48px]' : 'text-[56px]'} font-extrabold leading-tight`}>{v.q}</div>
          {v.phase === 'doc' && <div className="mt-2 text-[28px] font-semibold opacity-75">Nghe ông đồ đọc đề…</div>}
        </div>
      )}
      {v.phase !== 'cho' && v.phase !== 'vinhDanh' && <DapAn v={v} />}
    </>
  );
}

function BangCho({ v }: { v: ElimView }) {
  const phan = { color: PHAN, textShadow: '0 0 2px rgba(255,255,255,.35)' };
  const c = v.cong;
  return (
    <div className="absolute flex flex-col items-center justify-center px-2 text-center" style={{ left: 252, top: 528, width: 594, height: 300, ...phan }}>
      {v.phase === 'vinhDanh' ? (
        <div className="text-[54px] font-extrabold leading-tight" style={{ color: '#ffe27a' }}>Có người đứng vững cuối cùng!</div>
      ) : c ? (
        <>
          <div className="text-[50px] font-extrabold leading-tight" style={{ color: '#ffe27a' }}>Thả tim để mở ván mới</div>
          <div className="mt-3 flex w-[520px] items-center gap-3">
            <div className="h-7 flex-1 overflow-hidden rounded-full bg-black/50">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#c8102e,#ff6f91)' }} animate={{ width: `${(c.tim / c.can) * 100}%` }} />
            </div>
            <span className="text-[32px] font-bold tabular-nums">❤️ {c.tim}/{c.can}</span>
          </div>
          <div className="mt-3 text-[28px] font-semibold leading-snug opacity-90">hoặc tự mở sau {c.con} giây<br />gõ A, B, C hoặc D để ghi tên</div>
        </>
      ) : (
        <>
          <div className="text-[44px] font-extrabold leading-tight" style={{ color: '#ffe27a' }}>Ghi tên vào chiếu</div>
          <div className="text-[34px] font-bold leading-tight">còn <span className="text-[72px] font-extrabold tabular-nums leading-none" style={{ color: '#ffe27a' }}>{v.con}</span> giây</div>
          <div className="mt-2 space-y-0.5 text-[28px] font-semibold leading-snug">
            <div>Gõ A, B, C hoặc D để vào chiếu</div>
            <div>Mỗi câu {v.tongGiay} giây · sai hoặc bỏ trống là bị loại</div>
            <div>Không ai đúng thì không ai bị loại</div>
          </div>
        </>
      )}
    </div>
  );
}

/** 4 tấm bảng đáp án viết phấn, đặt dưới bảng đen (không hiện tỉ lệ khi đang hỏi) */
const DAP_AN = { w: 322, h: 86, gap: 12, x: 214, y: 856 };

function DapAn({ v }: { v: ElimView }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const text = v.opts[i];
        const right = v.dung === i;
        const dim = v.dung >= 0 && !right;
        const dai = (text?.length ?? 0) > 13;
        return (
          <motion.div
            key={`${v.cauSo}-${i}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: text ? (dim ? 0.45 : 1) : 0.3, y: 0, scale: right ? 1.04 : 1 }}
            transition={{ delay: text && v.phase === 'hoi' ? i * 0.05 : 0 }}
            className="absolute flex items-center gap-2 rounded-[14px] border-[4px] px-3"
            style={{
              left: DAP_AN.x + (i % 2) * (DAP_AN.w + DAP_AN.gap), top: DAP_AN.y + (i < 2 ? 0 : DAP_AN.h + DAP_AN.gap), width: DAP_AN.w, height: DAP_AN.h,
              borderColor: right ? '#9dffb3' : GOLD,
              background: right ? 'linear-gradient(rgba(40,140,70,.95),rgba(24,96,48,.95))' : 'linear-gradient(rgba(58,34,18,.93),rgba(34,18,8,.93))',
              color: PHAN, boxShadow: right ? '0 0 26px rgba(157,255,179,.75)' : '0 5px 12px rgba(0,0,0,.45)',
            }}
          >
            <span className="text-[40px] font-extrabold" style={{ color: '#ffe27a' }}>{'ABCD'[i]}.</span>
            <span className={`${dai ? 'text-[27px]' : 'text-[34px]'} line-clamp-2 min-w-0 font-bold leading-tight`}>{text ?? '…'}</span>
            {right && <div className="nhap-nhay pointer-events-none absolute -inset-[4px] rounded-[14px]" />}
          </motion.div>
        );
      })}
    </>
  );
}

/** Đồng hồ to ở góc trên phải bảng số người; lúc chốt thì đóng dấu HẾT GIỜ; lúc công bố hiện số người vừa bị loại */
function DongHo({ v }: { v: ElimView }) {
  const low = v.con <= 2;
  const bi = v.phase === 'dapAn' ? v.ghe.filter((h) => !h.alive).length : 0;
  return (
    <>
      {v.phase === 'hoi' && (
        <motion.div
          key={v.con}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="absolute flex items-center justify-center rounded-full border-[7px] text-[92px] font-extrabold leading-none"
          style={{ left: 792, top: 168, width: 140, height: 140, zIndex: 25, borderColor: GOLD, background: low ? '#b3200c' : '#5a1409', color: '#ffe9a8', boxShadow: '0 6px 18px rgba(0,0,0,.5)' }}
        >
          {v.con}
        </motion.div>
      )}
      <AnimatePresence>
        {bi > 0 && (
          <motion.div
            key={`bi-${v.cauSo}`}
            initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 380, damping: 15 }}
            className="absolute flex items-center justify-center whitespace-nowrap rounded-[18px] border-[5px] px-4 text-[66px] font-extrabold leading-none"
            style={{ left: 778, top: 190, height: 100, zIndex: 25, borderColor: '#fff3c4', background: 'linear-gradient(#d4281a,#8f1208)', color: '#fff3c4', boxShadow: '0 8px 22px rgba(0,0,0,.55)' }}
          >
            −{bi} ✕
          </motion.div>
        )}
        {v.phase === 'chot' && (
          <motion.div
            key={`chot-${v.cauSo}`}
            initial={{ scale: 2.6, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
            className="absolute flex items-center justify-center rounded-[16px] border-[7px] text-[60px] font-extrabold tracking-wider"
            style={{ left: 330, top: 352, width: 420, height: 104, zIndex: 20, borderColor: '#c8102e', color: '#c8102e', background: 'rgba(255,243,214,.95)', boxShadow: '0 8px 30px rgba(0,0,0,.45)' }}
          >
            HẾT GIỜ!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Bảng gỗ to trên tán đa: số người còn lại (hoặc đã ghi tên) là con số chính của chế độ này */
function CongSo({ v }: { v: ElimView }) {
  if (v.phase === 'vinhDanh') return null;
  const cho = v.phase === 'cho';
  const so = cho ? v.soNguoi : v.conLai;
  const tong = cho ? v.maxNguoi : v.soNguoi;
  const ti = tong > 0 ? Math.min(1, so / tong) : 0;
  const nguy = !cho && so > 0 && ti <= 0.2;
  const mau = nguy ? '#ff8a7a' : '#ffd977';
  return (
    <div className="absolute flex flex-col items-center justify-center rounded-[22px]" style={{
      left: TAM_BANG - 210, top: 140, width: 420, height: 206, border: `5px double ${GOLD}`, outline: '2px solid #3a0d05',
      background: 'linear-gradient(#8a2a14,#4f1309)', boxShadow: '0 10px 26px rgba(0,0,0,.55), inset 0 0 22px rgba(255,200,90,.25)',
    }}>
      <div className="text-[22px] font-extrabold leading-none tracking-[0.18em]" style={{ color: '#f3c97a' }}>{LOAI.title.toUpperCase()}</div>
      <div className="mt-1 flex items-baseline justify-center gap-2 leading-none">
        <motion.span
          key={so}
          initial={{ scale: 1.45, color: '#ffffff' }}
          animate={{ scale: 1, color: mau }}
          transition={{ type: 'spring', stiffness: 420, damping: 15 }}
          className="text-[112px] font-extrabold tabular-nums"
          style={{ textShadow: '0 5px 0 #3a0d05' }}
        >
          {so}
        </motion.span>
        <span className="text-[46px] font-bold tabular-nums opacity-80" style={{ color: CREAM }}>/ {tong}</span>
      </div>
      <div className="text-[26px] font-extrabold leading-none tracking-wider" style={{ color: CREAM }}>{cho ? 'SĨ TỬ ĐÃ GHI TÊN' : 'SĨ TỬ CÒN LẠI'}</div>
      <div className="mt-2 h-[10px] w-[340px] overflow-hidden rounded-full bg-black/50">
        <motion.div className="h-full rounded-full" style={{ background: nguy ? 'linear-gradient(90deg,#ff5a4d,#ffb199)' : 'linear-gradient(90deg,#ffd34d,#fff0a8)' }} animate={{ width: `${ti * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

/** Tấm bảng gỗ cạnh tên game: số câu */
function Nhan({ v }: { v: ElimView }) {
  const chu = v.phase === 'cho' ? 'GHI TÊN' : v.phase === 'vinhDanh' ? 'KẾT THÚC' : `CÂU ${v.cauSo}/${v.tongCau}`;
  return (
    <div className="absolute flex items-center justify-center whitespace-nowrap rounded-[14px] border-[3px] px-2 text-[30px] font-extrabold leading-none" style={{ left: 150, top: 362, width: 210, height: 78, background: PANEL, borderColor: GOLD }}>
      {chu}
    </div>
  );
}

/** Dòng tin giữa 4 đáp án và chiếu: ai đã nộp, kết quả vừa công bố, hoặc ai vừa ghi tên */
function DongTin({ v }: { v: ElimView }) {
  const kq = v.ketQua;
  const moi = v.ghe.slice(-2).map((h) => h.name).join(', ');
  const noi =
    v.phase === 'dapAn' && kq
      ? v.khongAiDung
        ? '😮 Không ai đúng, không ai bị loại'
        : `✅ ${kq.soDung} đúng · ✕ ${v.ghe.filter((h) => !h.alive).length} bị loại · còn ${v.conLai}`
      : v.phase === 'hoi' || v.phase === 'chot'
        ? `📜 ${v.soNop}/${v.conLai} đã nộp`
        : v.phase === 'cho'
          ? moi ? `🆕 Mới vào: ${moi}` : 'Gõ A, B, C hoặc D để ghi tên'
          : '';
  if (!noi) return null;
  return (
    <div className="absolute flex items-center justify-center" style={{ left: TAM_BANG - 330, top: 1050, width: 660, height: 54, zIndex: 1700 }}>
      <div className="max-w-full truncate rounded-full border-[3px] px-5 text-[30px] font-bold leading-[48px]" style={{ background: PANEL, borderColor: GOLD }}>{noi}</div>
    </div>
  );
}

// ---------------- người thắng ----------------

function NguoiThang({ v }: { v: ElimView }) {
  const w = v.thang;
  return (
    <div className="absolute inset-0" style={{ zIndex: 2000 }}>
      <div className="absolute overflow-hidden rounded-[14px] border-4" style={{ left: 60, top: 330, width: 960, height: 1310, borderColor: GOLD, background: 'radial-gradient(ellipse at 50% 40%,#fbf0d6 0%,#f3e2bb 75%,#ead39f 100%)' }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ left: 60, top: 330, width: 960, height: 1310, color: '#8a1c0c' }}
      >
        <div className="text-[48px] font-extrabold">🏆 NGƯỜI ĐỨNG VỮNG CUỐI CÙNG</div>
        {w ? (
          <>
            <div className="mt-8 rounded-full p-3" style={{ background: 'linear-gradient(#ffd34d,#e8a33d)', boxShadow: '0 0 50px rgba(255,211,77,.9)' }}>
              <Avatar h={w} size={300} />
            </div>
            <div className="mt-6 max-w-[880px] truncate text-[84px] font-extrabold leading-tight">{w.name}</div>
            <div className="mt-2 text-[40px] font-bold" style={{ color: '#4a1a0c' }}>
              Trả lời trung bình {TB(w.avgMs)} mỗi câu
            </div>
            <div className="mt-1 text-[32px] font-semibold" style={{ color: '#4a1a0c' }}>trong số {v.soNguoi} sĩ tử</div>
          </>
        ) : (
          <div className="mt-24 text-[44px] font-bold">Chưa có ai ghi tên</div>
        )}
        {v.yeuNhat && (
          <div className="mt-8 rounded-full border-4 px-8 py-2 text-[34px] font-extrabold" style={{ borderColor: GOLD, background: 'rgba(138,28,12,.9)', color: '#ffe9a8' }}>
            🌹 Được yêu quý nhất: {v.yeuNhat.name} · {v.yeuNhat.phieu} phiếu
          </div>
        )}
      </motion.div>
    </div>
  );
}
