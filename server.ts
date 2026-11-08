/**
 * Server chung cho mọi game live TikTok. Game riêng KHÔNG cần sửa file này,
 * trừ khi cần thêm API mới (đăng ký thêm module trong src/server/).
 *
 * - Kết nối phòng live TikTok (tiktok-live-connector 2.x, proto v3)
 * - Đẩy sự kiện xuống trình duyệt qua SSE: /api/tiktok/events
 * - Lệnh từ trang điều khiển -> trang stage: /api/control
 * - Giọng đọc tiếng Việt: /api/tts (VieNeu, Edge TTS, lỗi thì Google)
 * - Giả lập sự kiện để test không cần live: /api/test/emit
 */
import 'dotenv/config'; // first: modules below read process.env when they load
import express from 'express';
import path from 'path';
import { ROOT } from './src/server/store';
import { httpGuard } from './src/server/http-guard';
import { createSseHub } from './src/server/sse-hub';
import { caiDat, lastControl, registerSettings, savedTikTokUser, saveSettings } from './src/server/settings';
import { autoConnect, getLiveStats, registerTikTok } from './src/server/tiktok-connection';
import { registerControlRoutes } from './src/server/control-routes';
import { registerDataRoutes } from './src/server/weekly-board';
import { registerTts } from './src/server/tts/tts-routes';
import { registerGameHost } from './src/server/game-host';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3007;

app.use(httpGuard);
app.use(express.json());
app.use('/assets', express.static(path.join(ROOT, 'public', 'assets')));

const hub = createSseHub();
hub.register(app, () => [
  { event: 'status', data: getLiveStats() },
  { event: 'caiDat', data: caiDat() },
  ...(lastControl.rate ? [{ event: 'control', data: lastControl.rate }] : []),
  ...(lastControl.name ? [{ event: 'control', data: lastControl.name }] : []),
]);
registerTikTok(app, { broadcast: hub.broadcast, saveSettings, savedUser: savedTikTokUser() });
registerControlRoutes(app, hub.broadcast, hub.clientCount);
registerSettings(app, hub.broadcast);
registerDataRoutes(app);
registerTts(app);
registerGameHost(app, {});

// ---------- Khởi động ----------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      // LIVE_MODE=1 (BAT-LIVE.bat): tắt tự tải lại, sửa code không làm trang stage reset giữa live
      // Live: tắt hẳn kênh tự tải lại (ws) để không đụng cổng 24678 của game khác đang chạy.
      // Lúc sửa code: dùng cổng riêng 24680 cho kênh tự tải lại, game khác (Đi Chùa) giữ 24678.
      server:
        process.env.LIVE_MODE === '1'
          ? { middlewareMode: true, hmr: false, ws: false }
          : { middlewareMode: true, hmr: { port: 24680 } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(ROOT, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(ROOT, 'dist', 'index.html')));
  }

  // Chỉ nghe trên máy này: API không có đăng nhập, người cùng Wi-Fi không được điều khiển giọng đọc
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server chạy ở http://localhost:${PORT}  |  Link LIVE Studio: http://lvh.me:${PORT}/?view=stage`);
    // lần trước đang kết nối mà server bị tắt / bật lại: tự kết nối lại tài khoản đó
    autoConnect();
  });
}

start();
