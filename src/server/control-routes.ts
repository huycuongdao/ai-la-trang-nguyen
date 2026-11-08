import type { Express } from 'express';
import { lastControl, saveSettings } from './settings';
import type { Broadcast } from './sse-hub';
import { addLikes } from './tiktok-connection';

// ---------- Lệnh từ trang điều khiển (chỉ trang stage làm theo) ----------
export function registerControlRoutes(
  app: Express,
  broadcast: Broadcast,
  clientCount: () => number,
  /** Commands the game host carries out (speak, reset, start now, skip question) */
  onCommand: (action: string, text?: string) => void,
) {
  const CONTROL_ACTIONS = ['speak', 'setRate', 'reset', 'setName', 'custom'];
  app.post('/api/control', (req, res) => {
    const { action, text } = req.body || {};
    if (!CONTROL_ACTIONS.includes(action)) return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
    if (action === 'speak' && (typeof text !== 'string' || !text.trim())) {
      return res.status(400).json({ success: false, error: 'Chưa nhập nội dung cần đọc' });
    }
    const payload = { action, text: typeof text === 'string' ? text.trim().slice(0, 1000) : undefined };
    if (action === 'setRate' && payload.text) lastControl.rate = { action, text: payload.text };
    if (action === 'setName') {
      // Chỉ chữ thường, tối đa 40 ký tự
      const name = (payload.text || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 40);
      if (!name) return res.status(400).json({ success: false, error: 'Chưa nhập tên kênh' });
      payload.text = name;
      lastControl.name = { action, text: name };
      try {
        saveSettings({ channelName: name });
      } catch (err) {
        console.error('Không lưu được settings.json:', err);
      }
    }
    broadcast('control', payload);
    onCommand(action, payload.text);
    res.json({ success: true, pages: clientCount() });
  });

  // ---------- Giả lập sự kiện (test không cần live) ----------
  const TEST_EVENTS = ['chat', 'gift', 'member', 'follow', 'share', 'like'];
  app.post('/api/test/emit', (req, res) => {
    const { type, data } = req.body || {};
    if (!TEST_EVENTS.includes(type)) return res.status(400).json({ success: false, error: 'Loại sự kiện không hợp lệ' });
    const event = { timestamp: Date.now(), avatar: '', ...(data || {}) };
    if (type === 'like') {
      event.totalLikes = addLikes(Number(event.likeCount) || 1);
    }
    broadcast(type, event);
    res.json({ success: true });
  });
}
