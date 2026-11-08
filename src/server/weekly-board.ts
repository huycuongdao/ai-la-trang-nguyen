import type { Express } from 'express';
import fs from 'fs';
import { dataPath, writeJsonAtomic } from './store';

// Câu nào hỏi lúc nào, để game ưu tiên câu lâu chưa hỏi (tắt bật server vẫn nhớ)
const USED_FILE = dataPath('used-questions.json');
// Bảng vàng tuần: cộng điểm mọi ván trong tuần (thứ Hai tới Chủ nhật, giờ máy), sang tuần mới làm lại
const TUAN_FILE = dataPath('weekly-board.json');
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
export const topTuan = (b: BangTuan, n = 10) =>
  Object.values(b.ds)
    .sort((a, c) => c.diem - a.diem)
    .slice(0, n)
    .map((x) => ({ id: Object.keys(b.ds).find((k) => b.ds[k] === x), name: x.name, avatar: x.avatar, diem: x.diem }));

export type WeeklyEntry = { id: string; name: string; avatar: string; diem: number };

/** Questions already asked and when, so the game prefers questions not asked for a long time */
export function loadUsedQuestions(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(USED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveUsedQuestions(used: Record<string, number>) {
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(used)) if (typeof v === 'number' && k.length < 300) clean[k] = v;
  writeJsonAtomic(USED_FILE, clean);
}

/** Current week's top players (resets on Monday) */
export const weeklyTop = (n = 10) => topTuan(docTuan(), n);

/** Add one finished round's scores to this week's board; returns the new top */
export function addToWeekly(ds: unknown[]) {
  const b = docTuan();
  for (const x of ds.slice(0, 2000) as Record<string, unknown>[]) {
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
    console.error('Không lưu được data/weekly-board.json:', err);
  }
  return topTuan(b);
}

export function registerDataRoutes(app: Express) {
  app.get('/api/da-hoi', (_req, res) => res.json(loadUsedQuestions()));
  app.post('/api/da-hoi', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ success: false });
    try {
      saveUsedQuestions(body);
      res.json({ success: true });
    } catch (err) {
      console.error('Không lưu được data/used-questions.json:', err);
      res.status(500).json({ success: false });
    }
  });

  app.get('/api/bang-tuan', (_req, res) => res.json({ top: weeklyTop() }));
  app.post('/api/bang-tuan', (req, res) => {
    const ds = Array.isArray(req.body?.ds) ? req.body.ds : null;
    if (!ds) return res.status(400).json({ success: false });
    res.json({ top: addToWeekly(ds) });
  });
}
