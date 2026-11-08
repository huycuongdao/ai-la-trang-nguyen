import type { Express, Response } from 'express';

export type Broadcast = (eventType: string, data: unknown) => void;
export type InitialEvent = { event: string; data: unknown };

interface Client {
  res: Response;
  /** A page opened with ?view=stage (it draws the game and plays the sound) */
  stage: boolean;
}

export function createSseHub() {
  let clients: Client[] = [];

  // Only the stage page opened LAST plays sound, so two stage tabs never speak over each other.
  const audioTarget = () => [...clients].reverse().find((c) => c.stage);
  const write = (c: Client, payload: string) => {
    try {
      c.res.write(payload);
    } catch {
      // trình duyệt đã đóng
    }
  };
  const frame = (eventType: string, data: unknown) => `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  const broadcast: Broadcast = (eventType, data) => {
    const payload = frame(eventType, data);
    for (const c of clients) write(c, payload);
  };

  /** Spoken lines go to the audio stage page only */
  const sendToAudioStage: Broadcast = (eventType, data) => {
    const target = audioTarget();
    if (target) write(target, frame(eventType, data));
  };

  /** The game picture goes to everyone; stage pages also learn whether THEY are the one that plays sound */
  const broadcastView = (view: object) => {
    const target = audioTarget();
    const plain = frame('view', view);
    for (const c of clients) write(c, c.stage ? frame('view', { ...view, audio: c === target }) : plain);
  };

  /** `initial` lists what a new page must see first: status, settings, the last control commands. */
  function register(app: Express, initial: () => InitialEvent[]) {
    app.get('/api/tiktok/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      for (const { event, data } of initial()) res.write(frame(event, data));
      const client: Client = { res, stage: req.query.role === 'stage' };
      clients.push(client);

      const heartbeat = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.on('close', () => {
        clearInterval(heartbeat);
        clients = clients.filter((c) => c !== client);
      });
    });
  }

  return {
    broadcast,
    broadcastView,
    sendToAudioStage,
    register,
    clientCount: () => clients.length,
    stageCount: () => clients.filter((c) => c.stage).length,
  };
}
