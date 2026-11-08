import path from 'path';
import type { Express } from 'express';
import { readJson, ROOT, writeJsonAtomic } from './store';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../game/themes';

// Tên kênh (giọng đọc + tiêu đề) lưu ở settings.json cạnh file này, tắt server mở lại vẫn còn
const SETTINGS_FILE = path.join(ROOT, 'settings.json');
type Settings = { channelName?: string; tiktokUser?: string; tieuDe?: string; tenOngDo?: string; mode?: 'exam' | 'elimination'; maxNguoi?: number; theme?: string };
type Control = { action: string; text: string };

let settings: Settings = readJson<Settings>(SETTINGS_FILE) ?? {};
// Lệnh điều khiển gần nhất, gửi lại cho trang stage mới mở
export const lastControl: { rate: Control | null; name: Control | null } = { rate: null, name: null };
if (typeof settings.channelName === 'string' && settings.channelName.trim()) {
  lastControl.name = { action: 'setName', text: settings.channelName.trim() };
}

/** Chế độ chơi và số người tối đa của chế độ loại trực tiếp lần trước (trống = chế độ thi, mặc định trong elimination-config.ts) */
export const savedGameMode = () => (settings.mode === 'elimination' ? 'elimination' : 'exam');
export const savedMaxNguoi = () => (typeof settings.maxNguoi === 'number' ? settings.maxNguoi : undefined);

/** Chủ đề giao diện đã chọn (trống hoặc không còn tồn tại = mặc định) */
export const savedTheme = (): ThemeId => (isThemeId(settings.theme) ? settings.theme : DEFAULT_THEME);

/** Tài khoản TikTok đã lưu: tắt server bật lại thì tự kết nối */
export const savedTikTokUser = () => (typeof settings.tiktokUser === 'string' ? settings.tiktokUser : '');

export const saveSettings = (patch: Settings) => {
  settings = { ...settings, ...patch };
  try {
    writeJsonAtomic(SETTINGS_FILE, settings, true);
  } catch (err) {
    console.error('Không lưu được settings.json:', err);
  }
};

// Cài đặt hiển thị ở trang điều khiển: tên game trên mái tranh, tên ông đồ trên bảng tên. Trống = dùng mặc định trong config.ts
export const caiDat = () => ({ tieuDe: settings.tieuDe ?? '', tenOngDo: settings.tenOngDo ?? '', theme: savedTheme() });

export function registerSettings(app: Express, broadcast: (event: string, data: unknown) => void) {
  app.get('/api/cai-dat', (_req, res) => res.json(caiDat()));
  app.post('/api/cai-dat', (req, res) => {
    const sach = (x: unknown) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, 30) : undefined);
    const tieuDe = sach(req.body?.tieuDe);
    const tenOngDo = sach(req.body?.tenOngDo);
    saveSettings({ ...(tieuDe !== undefined && { tieuDe }), ...(tenOngDo !== undefined && { tenOngDo }) });
    broadcast('caiDat', caiDat());
    res.json({ success: true, ...caiDat() });
  });

}
