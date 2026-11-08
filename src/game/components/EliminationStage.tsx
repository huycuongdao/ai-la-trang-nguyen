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

// Chiếu đỏ: vị trí và bề rộng trên màn hình
const CHIEU = { x: 24, y: 975, w: 912, h: 670 };
const LE = 22; // lề trong chiếu

export function EliminationStage({ game }: { game: GameState }) {
  const v = game.view;
  if (!v || !isElimView(v)) return <div className="absolute inset-0" />;
  const thang = v.phase === 'vinhDanh';
  return (
    <div className="absolute inset-0 select-none" style={{ color: CREAM }}>
      <div className="absolute inset-0" style={{ background: `url(${NEN}) top center / 1080px 1920px no-repeat #1d0d0a` }} />
      <TenGame tieuDe={game.caiDat.tieuDe} />
      <Bang v={v} />
      <DongHo v={v} />
      <Nhan v={v} />
      <Chieu v={v} />
      <MC v={v} ten={game.caiDat.tenOngDo} />
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

/** Dây cờ treo phía trên chiếu và hai cột cờ lớn hai bên */
function DayCo() {
  const n = 10;
  const dai = CHIEU.w - 40;
  return (
    <>
      <div className="absolute" style={{ left: CHIEU.x + 20, top: CHIEU.y - 30, width: dai, height: 3, background: '#3a2410' }} />
      {Array.from({ length: n }, (_, i) => (
        <Co key={i} w={52} x={CHIEU.x + 20 + (dai - 52) * (i / (n - 1))} y={CHIEU.y - 28} xoay={i % 2 ? 3 : -3} />
      ))}
      {[CHIEU.x - 6, CHIEU.x + CHIEU.w - 36].map((x, i) => (
        <div key={x}>
          <div className="absolute" style={{ left: x + 14, top: CHIEU.y - 100, width: 8, height: 190, background: '#3a2410', borderRadius: 4 }} />
          <Co w={96} x={x + 22} y={CHIEU.y - 100} xoay={i ? -2 : 2} />
        </div>
      ))}
    </>
  );
}

// ---------------- chiếu và chỗ ngồi ----------------

/** Số chỗ tính để chia lưới: làm tròn lên để lưới không đổi cỡ mỗi khi có thêm một người */
const BAC = [8, 15, 24, 35, 48, 63, 80, 100, 130];
const bac = (n: number) => BAC.find((b) => n <= b) ?? n;

/** Lưới chia chiếu cho n chỗ: chọn số cột cho ô to nhất */
function luoi(n: number) {
  const W = CHIEU.w - 2 * LE;
  const H = CHIEU.h - 2 * LE;
  let best = { cols: 1, size: 0, cw: W, ch: H };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = W / cols;
    const ch = H / rows;
    const size = Math.min(cw * 0.9, ch / 1.4, 150);
    if (size > best.size) best = { cols, size, cw, ch };
  }
  return best;
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
        {!top && v.ghe.length === 0 && v.phase === 'cho' && (
          <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-[40px] font-extrabold" style={{ color: '#ffe9a8', textShadow: '0 3px 0 #3a0d05' }}>
            Chiếu còn trống<br />Gõ A, B, C hoặc D để ngồi vào
          </div>
        )}
      </div>
    </>
  );
}

function CacChoNgoi({ ghe, dapAn }: { ghe: Ghe[]; dapAn: boolean }) {
  const g = luoi(bac(Math.max(ghe.length, 1)));
  const rows = Math.ceil(ghe.length / g.cols);
  const lech = Math.max(0, (CHIEU.h - 2 * LE - rows * g.ch) / 2);
  const chu = Math.max(10, Math.round(g.size * 0.21));
  const soChu = g.size > 100 ? 14 : g.size > 70 ? 11 : g.size > 52 ? 9 : 7;
  return (
    <AnimatePresence>
      {ghe.map((h, i) => {
        const x = LE + (i % g.cols) * g.cw + (g.cw - g.size) / 2;
        const y = LE + lech + Math.floor(i / g.cols) * g.ch + (g.ch - g.size * (g.size >= 60 ? 1.35 : 1)) / 2;
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
            {g.size >= 60 && (
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
    <div className="absolute inset-0 flex flex-col items-center justify-center px-[22px] pb-2 pt-4">
      <div className="text-[40px] font-extrabold" style={{ color: '#ffe27a', textShadow: '0 3px 0 #3a0d05' }}>
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
              <Avatar h={u} size={Math.min(to ? 150 : 110, w - 24)} />
              <div className={`mt-2 w-full truncate text-center ${to ? 'text-[30px]' : 'text-[24px]'} font-extrabold`}>{u.name}</div>
              <div className={`${to ? 'text-[44px]' : 'text-[34px]'} font-extrabold tabular-nums`} style={{ color: '#9dffb3' }}>{TB(u.avgMs)}</div>
              <div className="text-[17px] font-semibold opacity-80">trung bình / câu</div>
              {v.binhChon && <div className={`mt-1 ${to ? 'text-[36px]' : 'text-[28px]'} font-extrabold tabular-nums`}>🌹 {u.phieu}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {v.binhChon && (
        <div className="mt-4 rounded-[14px] border-2 px-5 py-2 text-center text-[26px] font-bold leading-snug" style={{ borderColor: GOLD, background: PANEL }}>
          Gõ số trên huy hiệu để chọn sĩ tử, rồi tặng hoa 🌹 hoặc bóng bay 🎈 ủng hộ bạn ấy
          {v.yeuNhat && <div className="text-[24px]" style={{ color: '#ffe27a' }}>Đang được yêu quý nhất: {v.yeuNhat.name} · {v.yeuNhat.phieu} phiếu</div>}
        </div>
      )}
      {vuaLoai.length > 0 && (
        <div className="mt-3 max-w-full truncate text-[22px] font-semibold opacity-90">✕ Vừa bị loại: {vuaLoai.map((h) => h.name).join(', ')}</div>
      )}
    </div>
  );
}

// ---------------- bảng đen, đồng hồ, nhãn ----------------

function Bang({ v }: { v: ElimView }) {
  const phan = { color: PHAN, textShadow: '0 0 2px rgba(255,255,255,.35)' };
  return (
    <>
      {v.phase === 'cho' || v.phase === 'vinhDanh' ? <BangCho v={v} /> : (
        <div className="absolute flex flex-col items-center justify-center px-3 text-center" style={{ left: 232, top: 532, width: 524, height: 162, ...phan }}>
          <div className={`${v.q.length > 90 ? 'text-[30px]' : v.q.length > 55 ? 'text-[35px]' : 'text-[41px]'} font-extrabold leading-snug`}>{v.q}</div>
          {v.phase === 'doc' && <div className="mt-2 text-[24px] font-semibold opacity-75">Nghe ông đồ đọc đề…</div>}
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
    <div className="absolute flex flex-col items-center justify-center text-center" style={{ left: 230, top: 530, width: 620, height: 296, ...phan }}>
      {v.phase === 'vinhDanh' ? (
        <div className="text-[52px] font-extrabold" style={{ color: '#ffe27a' }}>Có người đứng vững cuối cùng!</div>
      ) : c ? (
        <>
          <div className="text-[46px] font-extrabold" style={{ color: '#ffe27a' }}>Thả tim để mở ván mới</div>
          <div className="mt-3 flex w-[480px] items-center gap-3">
            <div className="h-6 flex-1 overflow-hidden rounded-full bg-black/50">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#c8102e,#ff6f91)' }} animate={{ width: `${(c.tim / c.can) * 100}%` }} />
            </div>
            <span className="text-[30px] font-bold tabular-nums">❤️ {c.tim}/{c.can}</span>
          </div>
          <div className="mt-3 text-[28px] font-semibold opacity-90">hoặc tự mở sau {c.con} giây · gõ A, B, C hoặc D để ghi tên</div>
        </>
      ) : (
        <>
          <div className="text-[38px] font-extrabold" style={{ color: '#ffe27a' }}>Ghi tên vào chiếu · còn {v.con} giây</div>
          <div className="mt-4 space-y-1 text-[29px] font-semibold leading-snug">
            <div>Gõ A, B, C hoặc D để vào chiếu</div>
            <div>Mỗi câu {v.tongGiay} giây · sai hoặc bỏ trống là bị loại</div>
            <div>Không ai đúng thì không ai bị loại</div>
          </div>
        </>
      )}
    </div>
  );
}

/** 4 ô đáp án viết phấn trên bảng (không hiện tỉ lệ khi đang hỏi) */
function DapAn({ v }: { v: ElimView }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const text = v.opts[i];
        const right = v.dung === i;
        const dim = v.dung >= 0 && !right;
        return (
          <motion.div
            key={`${v.cauSo}-${i}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: text ? (dim ? 0.45 : 1) : 0.3, y: 0, scale: right ? 1.04 : 1 }}
            transition={{ delay: text && v.phase === 'hoi' ? i * 0.05 : 0 }}
            className="absolute flex items-center gap-2 rounded-[12px] border-[3px] px-3"
            style={{
              left: i % 2 ? 546 : 234, top: i < 2 ? 700 : 762, width: 300, height: 56,
              borderStyle: right ? 'solid' : 'dashed',
              borderColor: right ? '#9dffb3' : 'rgba(245,241,230,.55)',
              background: right ? 'rgba(60,170,90,.42)' : 'rgba(255,255,255,.05)',
              color: PHAN, boxShadow: right ? '0 0 22px rgba(157,255,179,.65)' : undefined,
            }}
          >
            <span className="text-[30px] font-extrabold" style={{ color: '#ffe27a' }}>{'ABCD'[i]}.</span>
            <span className={`${(text?.length ?? 0) > 16 ? 'text-[22px]' : 'text-[27px]'} truncate font-bold`}>{text ?? '…'}</span>
            {right && <div className="nhap-nhay pointer-events-none absolute -inset-[3px] rounded-[12px]" />}
          </motion.div>
        );
      })}
    </>
  );
}

function DongHo({ v }: { v: ElimView }) {
  const low = v.con <= 2;
  return (
    <>
      {v.phase === 'hoi' && (
        <motion.div
          key={v.con}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="absolute flex items-center justify-center rounded-full border-[5px] text-[46px] font-extrabold"
          style={{ left: 762, top: 530, width: 92, height: 92, zIndex: 25, borderColor: GOLD, background: low ? '#b3200c' : '#5a1409', color: '#ffe9a8', boxShadow: '0 6px 18px rgba(0,0,0,.45)' }}
        >
          {v.con}
        </motion.div>
      )}
      <AnimatePresence>
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

/** Hai tấm bảng gỗ dưới mái tranh: số câu / số người còn lại, và tên chế độ */
function Nhan({ v }: { v: ElimView }) {
  const cho = v.phase === 'cho';
  return (
    <>
      <div className="absolute flex flex-col items-center justify-center rounded-[14px] border-[3px] px-3" style={{ left: 150, top: 362, width: 210, height: 78, background: PANEL, borderColor: GOLD }}>
        <span className="text-[28px] font-extrabold leading-none">{cho ? 'GHI TÊN' : v.phase === 'vinhDanh' ? 'KẾT THÚC' : `CÂU ${v.cauSo}`}</span>
        <span className="text-[24px] font-bold leading-tight tabular-nums" style={{ color: '#ffd977' }}>
          {cho ? `${v.soNguoi}/${v.maxNguoi} người` : `Còn ${v.conLai}/${v.soNguoi}`}
        </span>
      </div>
      <div
        className="absolute flex items-center justify-center whitespace-nowrap rounded-[14px] border-[3px] px-3 text-[21px] font-extrabold"
        style={{ left: 222, top: 866, width: 200, height: 48, borderColor: GOLD, background: 'linear-gradient(#7a2414,#561409)', color: '#ffd977' }}
      >
        {LOAI.title.toUpperCase()}
      </div>
    </>
  );
}

/** Dòng tin dưới bảng đen: ai đã nộp, hoặc kết quả vừa công bố */
function DongTin({ v }: { v: ElimView }) {
  const kq = v.ketQua;
  const noi =
    v.phase === 'dapAn' && kq
      ? v.khongAiDung
        ? '😮 Không ai đúng, không ai bị loại'
        : `✅ ${kq.soDung} đúng · ✕ ${v.ghe.filter((h) => !h.alive).length} bị loại · còn ${v.conLai}`
      : v.phase === 'hoi' || v.phase === 'chot'
        ? `📜 ${v.soNop}/${v.conLai} đã nộp`
        : v.phase === 'cho'
          ? 'Gõ A, B, C hoặc D để ghi tên'
          : '';
  if (!noi) return null;
  return (
    <div className="absolute flex items-center justify-center" style={{ left: 432, top: 868, width: 430, height: 46, zIndex: 1700 }}>
      <div className="max-w-full truncate rounded-full border-2 px-4 text-[21px] font-bold leading-[40px]" style={{ background: PANEL, borderColor: GOLD }}>{noi}</div>
    </div>
  );
}

// ---------------- người thắng ----------------

function NguoiThang({ v }: { v: ElimView }) {
  const w = v.thang;
  return (
    <div className="absolute inset-0" style={{ zIndex: 2000 }}>
      <div className="absolute overflow-hidden rounded-[14px] border-4" style={{ left: 24, top: 330, width: 960, height: 1310, borderColor: GOLD, background: 'radial-gradient(ellipse at 50% 40%,#fbf0d6 0%,#f3e2bb 75%,#ead39f 100%)' }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ left: 24, top: 330, width: 960, height: 1310, color: '#8a1c0c' }}
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
