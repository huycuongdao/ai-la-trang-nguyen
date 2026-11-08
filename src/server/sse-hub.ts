import type { Express, Response } from 'express';

export type Broadcast = (eventType: string, data: unknown) => void;
export type InitialEvent = { event: string; data: unknown };

export function createSseHub() {
  let sseClients: Response[] = [];
  // Các trang stage đang mở (theo thứ tự mở). Chỉ trang mở SAU CÙNG được phát tiếng, tránh 2 giọng đọc đè nhau
  // khi lỡ có 2 nguồn Link trong LIVE Studio hoặc mở thêm ?view=stage ở trình duyệt khác.
  let stageIds: string[] = [];

  const broadcast: Broadcast = (eventType, data) => {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        // trình duyệt đã đóng
      }
    }
  };
  const announceSpeaker = () => broadcast('speaker', { id: stageIds[stageIds.length - 1] ?? null, count: stageIds.length });

  /** `initial` lists what a new page must see first: status, settings, the last control commands. */
  function register(app: Express, initial: () => InitialEvent[]) {
    app.get('/api/tiktok/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      for (const { event, data } of initial()) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      sseClients.push(res);
      const stageId = typeof req.query.stage === 'string' ? req.query.stage.slice(0, 40) : '';
      if (stageId) {
        stageIds = [...stageIds.filter((x) => x !== stageId), stageId];
        announceSpeaker();
      } else res.write(`event: speaker\ndata: ${JSON.stringify({ id: stageIds[stageIds.length - 1] ?? null, count: stageIds.length })}\n\n`);

      const heartbeat = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients = sseClients.filter((c) => c !== res);
        if (stageId) {
          stageIds = stageIds.filter((x) => x !== stageId);
          announceSpeaker();
        }
      });
    });
  }

  return { broadcast, register, clientCount: () => sseClients.length, stageCount: () => stageIds.length };
}
