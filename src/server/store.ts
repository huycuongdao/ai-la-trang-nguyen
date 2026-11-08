import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Project root: settings.json and data/ live here, whatever the working directory is. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dataPath = (name: string) => path.join(ROOT, 'data', name);

export function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

// Ghi file JSON an toàn: ghi ra file tạm cùng thư mục rồi đổi tên đè lên file thật, tắt máy giữa chừng không làm hỏng file
export function writeJsonAtomic(file: string, value: unknown, pretty = false) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, pretty ? 2 : undefined));
  for (let i = 0; ; i++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      if (i < 2) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); // Windows: phần mềm diệt virus có thể đang giữ file
        continue;
      }
      console.warn('Đổi tên file tạm lỗi, ghi thẳng:', err instanceof Error ? err.message : err);
      fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : undefined));
      fs.rmSync(tmp, { force: true });
      return;
    }
  }
}
