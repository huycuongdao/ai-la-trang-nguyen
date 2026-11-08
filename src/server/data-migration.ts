import fs from 'fs';
import path from 'path';
import { ROOT } from './store';

const RENAMES: [string, string][] = [
  ['da-hoi.json', 'used-questions.json'],
  ['bang-tuan.json', 'weekly-board.json'],
];

const stamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/**
 * One-time move of the old Vietnamese data file names to English ones.
 * Backs up the whole data folder first, then renames. Safe to run on every boot:
 * when the new file already exists it wins and the old file is left alone.
 */
export function migrateData(dataDir = path.join(ROOT, 'data'), backupRoot = ROOT, log: (msg: string) => void = console.log) {
  const todo = RENAMES.filter(([oldName]) => fs.existsSync(path.join(dataDir, oldName)));
  const pending: [string, string][] = [];
  for (const [oldName, newName] of todo) {
    if (fs.existsSync(path.join(dataDir, newName))) log(`[data] Có cả ${oldName} và ${newName}: dùng ${newName}, giữ nguyên ${oldName}`);
    else pending.push([oldName, newName]);
  }
  if (!pending.length) return;
  const backup = path.join(backupRoot, `data-backup-${stamp(new Date())}`);
  fs.cpSync(dataDir, backup, { recursive: true });
  for (const [oldName, newName] of pending) {
    try {
      fs.renameSync(path.join(dataDir, oldName), path.join(dataDir, newName));
      log(`[data] Đã đổi ${oldName} -> ${newName} (bản sao lưu: ${path.basename(backup)})`);
    } catch (err) {
      log(`[data] Không đổi được ${oldName}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
