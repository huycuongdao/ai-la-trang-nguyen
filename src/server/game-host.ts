import type { Express } from 'express';
import { loadRoom, saveRoom } from './room-store';

/**
 * Round persistence. While the engine still runs in the stage page, the stage posts its snapshot here
 * and reads it back after a reload. Replaced when the engine moves to the server.
 */
export function registerGameHost(app: Express, _deps: Record<string, never>) {
  app.get('/api/room', (_req, res) => res.json(loadRoom(Date.now())));
  app.post('/api/room', (req, res) => {
    const snap = req.body;
    if (!snap || snap.version !== 1 || typeof snap.savedAt !== 'number') return res.status(400).json({ success: false });
    try {
      saveRoom(snap);
      res.json({ success: true });
    } catch (err) {
      console.error('Không lưu được data/room.json:', err);
      res.status(500).json({ success: false });
    }
  });
}
