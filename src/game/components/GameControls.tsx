import { useEffect, useState } from 'react';
import { emitTest, sendControl } from '../../live/utils/page';
import { GAME } from '../config';
import { LOAI } from '../elimination-config';
import { THEMES, THEME_IDS, isThemeId, type ThemeId } from '../themes';

const HO = ['Minh', 'Lan', 'Tuấn', 'Hoa', 'Long', 'Thảo', 'Nam', 'Vy', 'Khánh', 'An', 'Bình', 'Trang', 'Hùng', 'My', 'Phúc'];

/** Giả lập n người gõ đáp án trong vài giây (chỉ để thử, không cần live) */
function giaLap(n: number, trongMs: number) {
  for (let i = 0; i < n; i++) {
    const id = Math.floor(Math.random() * 100_000);
    setTimeout(() => {
      emitTest('chat', {
        username: `situ${id}`,
        nickname: `${HO[id % HO.length]}_${id % 1000}`,
        comment: 'ABCD'[Math.floor(Math.random() * 4)],
        createTime: Date.now() - 300 - Math.random() * 800, // trễ mạng giả
      });
    }, Math.random() * trongMs);
  }
}

type Mode = 'exam' | 'elimination';

/** Người chơi giả cố định (cùng một nhóm qua nhiều câu) để thử chế độ loại trực tiếp */
function giaLapNhom(n: number, comment: (i: number) => string, trongMs: number) {
  for (let i = 1; i <= n; i++) {
    setTimeout(() => {
      emitTest('chat', {
        username: `sim${i}`,
        nickname: `${HO[i % HO.length]}_${i}`,
        comment: comment(i),
        createTime: Date.now() - 300 - Math.random() * 500,
      });
    }, Math.random() * trongMs);
  }
}

/** Chọn chế độ chơi + số người tối đa + nút thử cho chế độ loại trực tiếp */
function ModeControls() {
  const btn = 'rounded-xl px-4 py-2 font-semibold';
  const [mode, setMode] = useState<Mode | ''>('');
  const [cap, setCap] = useState(LOAI.maxNguoi);
  const [theme, setTheme] = useState<ThemeId | ''>('');
  const [dang, setDang] = useState(false);
  const lam = () =>
    fetch('/api/game/mode').then((r) => r.json()).then((c) => {
      setMode(c.mode);
      if (typeof c.maxNguoi === 'number') setCap(c.maxNguoi);
      if (isThemeId(c.theme)) setTheme(c.theme);
    }).catch(() => {});
  useEffect(() => {
    lam();
    const id = setInterval(lam, 2000);
    return () => clearInterval(id);
  }, []);
  // kết thúc ván đang chơi rồi chuyển chế độ (chỉ chuyển được lúc đang chờ ván)
  const doi = async (m: Mode) => {
    if (m === mode) return;
    setDang(true);
    await sendControl('reset');
    await sendControl('custom', `mode:${m}`);
    await lam();
    setDang(false);
  };
  // đổi chủ đề giao diện (và bộ câu hỏi của chủ đề): cũng kết thúc ván đang chơi
  const doiChuDe = async (t: ThemeId) => {
    if (t === theme) return;
    setDang(true);
    await sendControl('reset');
    await sendControl('custom', `theme:${t}`);
    await lam();
    setDang(false);
  };
  const datCap = async (n: number) => {
    setCap(n);
    await sendControl('custom', `cap:${n}`);
  };
  const chon = (on: boolean) => (on ? 'bg-amber-600 text-white' : 'bg-white/10 text-white');
  return (
    <div className="space-y-2 rounded-xl bg-black/20 p-3">
      <div className="text-sm text-white/60">Chế độ chơi (đổi sẽ kết thúc ván đang chơi):</div>
      <div className="flex flex-wrap gap-2">
        <button disabled={dang} className={`${btn} ${chon(mode === 'exam')}`} onClick={() => doi('exam')}>🏮 Thi Trạng Nguyên (20 câu)</button>
        <button disabled={dang} className={`${btn} ${chon(mode === 'elimination')}`} onClick={() => doi('elimination')}>⚔️ Loại trực tiếp</button>
      </div>
      <div className="text-sm text-white/60">Chủ đề giao diện (đổi sẽ kết thúc ván đang chơi, câu hỏi theo chủ đề):</div>
      <div className="flex flex-wrap gap-2">
        {THEME_IDS.map((t) => (
          <button key={t} disabled={dang} className={`${btn} ${chon(theme === t)}`} onClick={() => doiChuDe(t)}>{THEMES[t].label}</button>
        ))}
      </div>
      {mode === 'elimination' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/60">Số người tối đa (từ ván sau):</span>
            {[50, 100].map((n) => (
              <button key={n} className={`${btn} ${chon(cap === n)}`} onClick={() => datCap(n)}>{n} người</button>
            ))}
          </div>
          <div className="text-sm text-white/60">Giả lập loại trực tiếp (người chơi cố định sim1, sim2...):</div>
          <div className="flex flex-wrap gap-2">
            {[50, 100].map((n) => (
              <button key={n} className={`${btn} bg-white/10 text-white`} onClick={() => giaLapNhom(n, () => 'tham gia', 4000)}>Đăng ký {n} người</button>
            ))}
            <button className={`${btn} bg-white/10 text-white`} onClick={() => giaLapNhom(cap, () => 'ABCD'[Math.floor(Math.random() * 4)], 3500)}>Cả nhóm trả lời ngẫu nhiên</button>
            <button className={`${btn} bg-white/10 text-white`} onClick={() => emitTest('like', { username: 'sim1', nickname: 'sim1', likeCount: LOAI.timTiepTuc })}>Thả {LOAI.timTiepTuc} tim</button>
            <button
              className={`${btn} bg-white/10 text-white`}
              onClick={() => {
                giaLapNhom(20, () => String(1 + Math.floor(Math.random() * LOAI.topN)), 800);
                setTimeout(() => {
                  for (let i = 1; i <= 20; i++) {
                    emitTest('gift', { username: `sim${i}`, nickname: `sim${i}`, giftName: 'Rose', giftId: 1, diamondCount: 1, repeatCount: 1 });
                  }
                }, 1500);
              }}
            >
              Bình chọn thử (20 người, hoa)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Nút riêng của game trên trang điều khiển */
export function GameControls() {
  const btn = 'rounded-xl px-4 py-2 font-semibold';
  const [tieuDe, setTieuDe] = useState('');
  const [tenOngDo, setTenOngDo] = useState('');
  const [daLuu, setDaLuu] = useState('');
  useEffect(() => {
    fetch('/api/cai-dat').then((r) => r.json()).then((c) => {
      setTieuDe(c.tieuDe ?? '');
      setTenOngDo(c.tenOngDo ?? '');
    }).catch(() => {});
  }, []);
  const luu = async () => {
    const r = await fetch('/api/cai-dat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tieuDe, tenOngDo }) });
    setDaLuu(r.ok ? 'Đã lưu, màn hình đổi ngay' : 'Lưu không được');
  };
  const o = 'w-full rounded-lg bg-black/40 px-3 py-2 text-white outline-none ring-1 ring-white/15 focus:ring-amber-400';
  return (
    <div className="space-y-3 rounded-2xl bg-white/5 p-4">
      <div className="font-bold text-amber-300">Ai Là Trạng Nguyên</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-white/70">
          Chữ trên mái tranh (tối đa 30 ký tự)
          <input className={o} value={tieuDe} maxLength={30} placeholder={GAME.tieuDeMacDinh} onChange={(e) => setTieuDe(e.target.value)} />
        </label>
        <label className="text-sm text-white/70">
          Tên ông đồ (bảng tên trên đầu)
          <input className={o} value={tenOngDo} maxLength={30} placeholder={GAME.tenOngDoMacDinh} onChange={(e) => setTenOngDo(e.target.value)} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className={`${btn} bg-emerald-700 text-white`} onClick={luu}>💾 Lưu tên</button>
        <span className="text-sm text-white/60">{daLuu || 'Để trống là dùng tên mặc định'}</span>
      </div>
      <ModeControls />
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} bg-amber-600 text-white`} onClick={() => sendControl('custom', 'batdau')}>
          ▶ Bắt đầu ván mới ngay
        </button>
        <button className={`${btn} bg-red-800 text-white`} onClick={() => sendControl('custom', 'bocau')}>
          🚫 Bỏ câu này
        </button>
      </div>
      <div className="text-sm text-white/60">Giả lập (bấm lúc đang hiện 4 đáp án):</div>
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} bg-white/10 text-white`} onClick={() => giaLap(1, 500)}>1 người</button>
        <button className={`${btn} bg-white/10 text-white`} onClick={() => giaLap(60, 6000)}>60 người</button>
        <button className={`${btn} bg-white/10 text-white`} onClick={() => giaLap(500, 8000)}>500 người</button>
      </div>
    </div>
  );
}
