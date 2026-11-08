// Chuẩn bị ảnh một chủ đề giao diện: art-source/<chủ đề>/NN-*.png -> public/assets/<chủ đề>/<tên>.webp
// Chạy:  node tools/prepare-theme-art.mjs <chủ đề>   (vd: dinh-lang)
// Mỗi chủ đề có 14 ảnh, nhận ra theo 2 số đầu tên file (00-... đến 13-...), phần chữ sau số tuỳ ý.
// Ảnh gốc có nền trong suốt nhưng viền dính nhiều điểm mờ (alpha thấp) và đốm lẻ; ở đây:
//   1. alpha <= LOW coi như trong suốt, alpha >= HIGH coi như đặc, ở giữa kéo giãn tuyến tính
//   2. bỏ các mảng rời quá nhỏ so với mảng lớn nhất (đốm bụi quanh nhân vật, khung)
//   3. xuất webp, không phóng to ảnh
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const theme = process.argv[2];
if (!theme || !/^[\w-]+$/.test(theme)) {
  console.error('Dùng:  node tools/prepare-theme-art.mjs <chủ đề>   (thư mục art-source/<chủ đề>/)');
  process.exit(1);
}
const SRC = path.join(ROOT, 'art-source', theme);
const OUT = path.join(ROOT, 'public/assets', theme);
const LOW = 40;
const HIGH = 200;
const MIN_PART = 0.004; // mảng nhỏ hơn 0,4% mảng lớn nhất thì bỏ

// [số đầu tên file gốc, tên ra, chiều rộng tối đa, có cần dọn alpha không]. Tên ra phải khớp artPaths() trong stage-skin/skin.tsx
const JOBS = [
  ['00', 'background', 1080, false],
  ['01', 'floor', 1080, false],
  ['02', 'pavilion', 1200, true],
  ['03', 'title-sign', 1080, true],
  ['04', 'host', 480, true],
  ['05', 'gong-clock', 768, true],
  ['06', 'question-sign', 1200, true],
  ['07', 'answer-frame', 900, true],
  ['08', 'mat', 1080, true],
  ['09', 'avatar-ring', 512, true],
  ['10', 'name-plate', 640, true],
  ['11', 'avatar-male', 512, true],
  ['12', 'avatar-female', 512, true],
  ['13', 'cloud-border', 1440, true],
];

if (!fs.existsSync(SRC)) {
  console.error(`không có thư mục art-source/${theme}`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC);
for (const [prefix, to, maxW, clean] of JOBS) {
  const file = files.find((f) => f.startsWith(`${prefix}-`) && /\.(png|webp|jpg)$/i.test(f));
  if (!file) {
    console.error(`thiếu ảnh gốc "${prefix}-*" trong art-source/${theme}`);
    process.exitCode = 1;
    continue;
  }
  const src = path.join(SRC, file);
  let img = sharp(src).ensureAlpha();
  if (clean) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const n = W * H;
    for (let i = 0; i < n; i++) {
      const a = data[i * 4 + 3];
      data[i * 4 + 3] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255);
    }
    // gom mảng liên thông (4 hướng) rồi bỏ mảng nhỏ
    const comp = new Int32Array(n).fill(-1);
    const sizes = [];
    const stack = [];
    for (let s = 0; s < n; s++) {
      if (data[s * 4 + 3] === 0 || comp[s] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      comp[s] = id;
      stack.push(s);
      while (stack.length) {
        const i = stack.pop();
        size++;
        const x = i % W;
        for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
          if (j >= 0 && j < n && comp[j] < 0 && data[j * 4 + 3] !== 0) {
            comp[j] = id;
            stack.push(j);
          }
        }
      }
      sizes.push(size);
    }
    const biggest = Math.max(...sizes);
    let removed = 0;
    for (let i = 0; i < n; i++) {
      if (comp[i] >= 0 && sizes[comp[i]] < biggest * MIN_PART) {
        data[i * 4 + 3] = 0;
        removed++;
      }
    }
    img = sharp(data, { raw: { width: W, height: H, channels: 4 } });
    console.log(`${to}: bỏ ${sizes.filter((s) => s < biggest * MIN_PART).length} mảng rời (${removed}px)`);
  }
  await img.resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(path.join(OUT, `${to}.webp`));
}
console.log('xong ->', path.relative(ROOT, OUT));
