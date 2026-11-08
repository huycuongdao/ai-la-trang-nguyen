import type { Express } from 'express';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import type { Broadcast } from './sse-hub';

interface LiveStats {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
}

const emptyStats = (): LiveStats => ({
  isConnected: false,
  isConnecting: false,
  username: '',
  roomId: '',
  viewerCount: 0,
  totalLikes: 0,
  error: '',
});


export interface TikTokDeps {
  broadcast: Broadcast;
  saveSettings: (patch: { tiktokUser: string }) => void;
  /** Account to keep connected (from settings.json) */
  savedUser: string;
}

let broadcast: Broadcast = () => {};
let saveSettings: TikTokDeps['saveSettings'] = () => {};
let liveStats = emptyStats();
let activeConn: InstanceType<typeof TikTokLiveConnection> | null = null;
// tài khoản TikTok đang cần giữ kết nối: rớt thì tự kết nối lại, tắt server bật lại cũng tự kết nối
let wantUser = '';

export const getLiveStats = () => liveStats;

/** Test events: likes add to the running total shown on the stage */
export function addLikes(n: number) {
  liveStats.totalLikes += n;
  return liveStats.totalLikes;
}

const userOf = (data: any) => data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'nguoi-xem';
const nickOf = (data: any) => data?.user?.nickname || data?.nickname || data?.uniqueId || 'Bạn';
const avatarOf = (data: any) => data?.user?.avatarThumb?.urlList?.[0] || '';

// ---------- Tự kết nối lại (treo live cả ngày) ----------
// Rớt kết nối / hết phiên live / chưa live: thử lại sau 15 giây, rồi 30, 60, tối đa 2 phút một lần, cho tới khi được.
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTries = 0;
function scheduleReconnect(why: string) {
  if (!wantUser || reconnectTimer) return;
  const delay = Math.min(120_000, 15_000 * 2 ** reconnectTries);
  reconnectTries++;
  console.log(`[TikTok] ${why}. Tự kết nối lại @${wantUser} sau ${delay / 1000} giây`);
  liveStats = { ...liveStats, isConnected: false, isConnecting: false, error: `${why}. Tự kết nối lại sau ${delay / 1000} giây` };
  broadcast('status', liveStats);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTikTok(wantUser).catch((err) => scheduleReconnect(`Chưa kết nối lại được (${err instanceof Error ? err.message : err})`));
  }, delay);
}
const stopReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  reconnectTries = 0;
};

async function connectTikTok(cleanUser: string) {
  if (activeConn) {
    try {
      activeConn.disconnect();
    } catch {
      // bỏ qua
    }
    activeConn = null;
  }

  liveStats = { ...emptyStats(), isConnecting: true, username: cleanUser };
  broadcast('status', liveStats);

  const conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    // Lấy danh sách quà cần gói trả phí Euler Stream; sự kiện quà đã có tên và kim cương
    enableExtendedGiftInfo: false,
  });

  conn.on(ControlEvent.CONNECTED, (state: { roomId?: string }) => {
    console.log(`[TikTok] Đã kết nối @${cleanUser}, room ${state?.roomId}`);
    liveStats = { ...liveStats, isConnected: true, isConnecting: false, roomId: state?.roomId || '', error: '' };
    broadcast('status', liveStats);
    reconnectTries = 0;
  });

  // kết nối cũ bị thay bằng kết nối mới thì không tự nối lại (activeConn đã khác)
  conn.on(ControlEvent.DISCONNECTED, () => {
    console.log(`[TikTok] Mất kết nối @${cleanUser}`);
    if (activeConn !== conn) return;
    liveStats = { ...liveStats, isConnected: false, isConnecting: false };
    broadcast('status', liveStats);
    scheduleReconnect('Mất kết nối TikTok');
  });

  conn.on(WebcastEvent.STREAM_END, () => {
    if (activeConn !== conn) return;
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, error: 'Phiên live đã kết thúc' };
    broadcast('status', liveStats);
    scheduleReconnect('Phiên live đã kết thúc');
  });

  conn.on(WebcastEvent.CHAT, (data: any) => {
    broadcast('chat', {
      username: userOf(data),
      nickname: nickOf(data),
      comment: data?.content || data?.comment || '', // proto v3: chữ nằm ở `content`
      avatar: avatarOf(data),
      timestamp: Date.now(),
      // giờ TikTok gắn lúc người xem gửi (ms): xếp ai trả lời nhanh nhất theo giờ này, không theo lúc bot nhận
      createTime: Number(data?.common?.createTime) || Date.now(),
    });
  });

  // TikTok gửi lại quà combo với repeatCount cộng dồn; chỉ chuyển phần mới
  const streakCounts = new Map<string, number>();
  conn.on(WebcastEvent.GIFT, (data: any) => {
    const username = userOf(data);
    const giftId = data?.giftId || 0;
    const key = `${username}_${giftId}`;
    const total = data?.repeatCount || 1;
    const delta = total - (streakCounts.get(key) || 0);
    const isStreakable = (data?.gift?.type ?? data?.giftDetails?.giftType ?? data?.giftType) === 1;
    if (isStreakable && !data?.repeatEnd) streakCounts.set(key, total);
    else streakCounts.delete(key);
    if (delta <= 0) return;

    broadcast('gift', {
      username,
      nickname: nickOf(data),
      giftName: data?.gift?.name || data?.giftDetails?.giftName || data?.giftName || 'Quà',
      giftId,
      diamondCount: data?.gift?.diamondCount || data?.diamondCount || data?.giftDetails?.diamondCount || 1,
      repeatCount: delta,
      avatar: avatarOf(data),
      timestamp: Date.now(),
    });
  });

  conn.on(WebcastEvent.MEMBER, (data: any) => {
    broadcast('member', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.FOLLOW, (data: any) => {
    broadcast('follow', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.SHARE, (data: any) => {
    broadcast('share', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.ROOM_USER, (data: any) => {
    if (typeof data?.viewerCount === 'number') {
      liveStats.viewerCount = data.viewerCount;
      broadcast('roomUser', { viewerCount: data.viewerCount });
    }
  });

  conn.on(WebcastEvent.LIKE, (data: any) => {
    if (typeof data?.totalLikeCount === 'number') liveStats.totalLikes = data.totalLikeCount;
    broadcast('like', {
      username: userOf(data),
      nickname: nickOf(data),
      likeCount: data?.likeCount || 1,
      totalLikes: liveStats.totalLikes,
    });
  });

  conn.on(ControlEvent.ERROR, (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[TikTok] Lỗi @${cleanUser}:`, msg);
    liveStats.error = msg;
    broadcast('status', liveStats);
  });

  activeConn = conn;

  try {
    // Chưa LIVE thì thư viện có thể treo mãi ở "Đang kết nối": hỏi TikTok trước, báo lỗi ngay
    const live = await conn.fetchIsLive().catch(() => true); // hỏi lỗi thì cứ thử kết nối
    if (!live) throw new Error('TikTok báo tài khoản này CHƯA LIVE. Bấm Phát trực tiếp trong LIVE Studio trước rồi mới kết nối');
    return await Promise.race([
      conn.connect(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('quá 30 giây không vào được phòng live')), 30_000)),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, error: msg };
    broadcast('status', liveStats);
    if (activeConn === conn) {
      try {
        conn.disconnect();
      } catch {
        // bỏ qua
      }
      activeConn = null;
    }
    throw err;
  }
}

/** Server just started: reconnect the account that was connected last time */
export function autoConnect() {
  if (!wantUser) return;
  console.log(`[TikTok] Tự kết nối lại @${wantUser} (lần trước đang kết nối)`);
  connectTikTok(wantUser).catch((err) => scheduleReconnect(`Chưa kết nối được (${err instanceof Error ? err.message : err})`));
}

export function registerTikTok(app: Express, deps: TikTokDeps) {
  broadcast = deps.broadcast;
  saveSettings = deps.saveSettings;
  wantUser = deps.savedUser;

  app.get('/api/tiktok/status', (_req, res) => res.json({ success: true, data: liveStats }));

  app.post('/api/tiktok/connect', async (req, res) => {
    const cleanUser = String(req.body?.username || '').replace(/^@/, '').trim();
    if (!cleanUser) return res.status(400).json({ success: false, error: 'Chưa nhập username TikTok' });
    stopReconnect();
    wantUser = cleanUser;
    saveSettings({ tiktokUser: cleanUser });
    try {
      const state = await connectTikTok(cleanUser);
      return res.json({ success: true, roomId: state?.roomId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      scheduleReconnect(`Không kết nối được: ${msg}`);
      return res.status(400).json({
        success: false,
        error: `Không kết nối được @${cleanUser}: ${msg}. Tài khoản phải đang LIVE trên TikTok. Server sẽ tự thử lại.`,
      });
    }
  });

  app.post('/api/tiktok/disconnect', (_req, res) => {
    // chủ kênh tự ngắt: thôi tự kết nối lại, bật server lại cũng không tự kết nối
    stopReconnect();
    wantUser = '';
    saveSettings({ tiktokUser: '' });
    try {
      activeConn?.disconnect();
    } catch {
      // bỏ qua
    }
    activeConn = null;
    liveStats = emptyStats();
    broadcast('status', liveStats);
    res.json({ success: true });
  });
}
