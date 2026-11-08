import type { Express } from 'express';
import fs from 'fs';
import { dataPath, writeJsonAtomic } from './store';

// Câu nào hỏi lúc nào, để game ưu tiên câu lâu chưa hỏi (tắt bật server vẫn nhớ)
const USED_FILE = dataPath('da-hoi.json');
// Bảng vàng tuần: cộng điểm mọi ván trong tuần (thứ Hai tới Chủ nhật, giờ máy), sang tuần mới làm lại
const TUAN_FILE = dataPath('bang-tuan.json');
type BangTuan = { tuan: string; ds: Record<string, { name: string; avatar: string; diem: number; van: number }> };
function tuanNay(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // về thứ Hai
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function docTuan(): BangTuan {
  try {
    const b = JSON.parse(fs.readFileSync(TUAN_FILE, 'utf8')) as BangTuan;
    if (b.tuan === tuanNay() && b.ds) return b;
  } catch {
    // chưa có file
  }
  return { tuan: tuanNay(), ds: {} };
}
const topTuan = (b: BangTuan, n = 10) =>
  Object.values(b.ds)
    .sort((a, c) => c.diem - a.diem)
    .slice(0, n)
    .map((x) => ({ id: Object.keys(b.ds).find((k) => b.ds[k] === x), name: x.name, avatar: x.avatar, diem: x.diem }));

export function registerDataRoutes(app: Express) {
  app.get('/api/da-hoi', (_req, res) => {
    try {
      res.json(JSON.parse(fs.readFileSync(USED_FILE, 'utf8')));
    } catch {
      res.json({});
    }
  });
  app.post('/api/da-hoi', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ success: false });
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(body)) if (typeof v === 'number' && k.length < 300) clean[k] = v;
    try {
      writeJsonAtomic(USED_FILE, clean);
      res.json({ success: true });
    } catch (err) {
      console.error('Không lưu được data/da-hoi.json:', err);
      res.status(500).json({ success: false });
    }
  });

  app.get('/api/bang-tuan', (_req, res) => res.json({ top: topTuan(docTuan()) }));
  app.post('/api/bang-tuan', (req, res) => {
    const ds = Array.isArray(req.body?.ds) ? req.body.ds.slice(0, 2000) : null;
    if (!ds) return res.status(400).json({ success: false });
    const b = docTuan();
    for (const x of ds) {
      const id = typeof x?.id === 'string' ? x.id.slice(0, 100) : '';
      const diem = Number(x?.diem);
      if (!id || !Number.isFinite(diem) || diem <= 0 || diem > 20_000) continue; // 1 ván tối đa ~8.000 điểm
      const cu = b.ds[id] ?? { name: '', avatar: '', diem: 0, van: 0 };
      b.ds[id] = {
        name: String(x.name ?? cu.name).slice(0, 60),
        avatar: typeof x.avatar === 'string' && x.avatar.startsWith('https://') ? x.avatar.slice(0, 500) : cu.avatar,
        diem: cu.diem + Math.round(diem),
        van: cu.van + 1,
      };
    }
    try {
      writeJsonAtomic(TUAN_FILE, b);
    } catch (err) {
      console.error('Không lưu được data/bang-tuan.json:', err);
    }
    res.json({ top: topTuan(b) });
  });
}
