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

// Quy tắc từng chủ đề. Chủ đề không có ở đây: mỗi file NN-ten.png thành ten.webp, dọn alpha và cắt viền trong suốt thừa,
// rộng tối đa 1200px (trừ ảnh không có alpha: giữ nguyên khung).
// `names`: số đầu tên file -> tên ra (dinh-lang đặt tên file gốc bằng tiếng Việt). `keepCanvas`: tên ra không cắt viền (vị trí trong khung quan trọng).
// `maxW`: chiều rộng tối đa riêng cho từng tên ra. Tên ra phải khớp ảnh mà kit của chủ đề dùng (stage-skin/skins, kits).
const DINH_NAMES = {
  '00': 'background', '01': 'floor', '02': 'pavilion', '03': 'title-sign', '04': 'host', '05': 'gong-clock', '06': 'question-sign',
  '07': 'answer-frame', '08': 'mat', '09': 'avatar-ring', '10': 'name-plate', '11': 'avatar-male', '12': 'avatar-female', '13': 'cloud-border', '14': 'steps-wide',
};
const RULES = {
  'dinh-lang': {
    names: DINH_NAMES,
    trim: false, // số đo trong skin tính trên khung ảnh gốc
    trimNames: ['steps-wide'], // riêng ảnh này cắt viền trong suốt (chỉ cần bề rộng khi đặt)
    maxW: { background: 1080, floor: 1080, pavilion: 1200, 'title-sign': 1080, host: 480, 'gong-clock': 768, 'question-sign': 1200, 'answer-frame': 900, mat: 1080, 'avatar-ring': 512, 'name-plate': 640, 'avatar-male': 512, 'avatar-female': 512, 'cloud-border': 1440, 'steps-wide': 1600 },
  },
  'vua-khan-dai': {
    trim: true,
    keepCanvas: ['graphic-accents'],
    maxW: { 'stadium-background': 1080, 'pitch-ground': 1400, 'title-logo': 1000, 'host-mc': 640, 'grandstand-terraces': 1200, 'player-chair': 420, 'question-panel': 1100, 'answer-button': 1000, 'timer-ring': 420, 'round-status-bar': 1000, 'player-nameplate': 640, 'graphic-accents': 941, 'player-male': 420, 'player-female': 420 },
  },
};
const rule = RULES[theme] ?? { trim: true, maxW: {} };

if (!fs.existsSync(SRC)) {
  console.error(`không có thư mục art-source/${theme}`);
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`không có thư mục art-source/${theme}`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => /^\d+-.+\.(png|webp|jpg)$/i.test(f)).sort();
if (rule.names) {
  const missing = Object.keys(rule.names).filter((n) => n !== '14').filter((n) => !files.some((f) => f.startsWith(`${n}-`)));
  if (missing.length) {
    console.error(`thiếu ảnh gốc số ${missing.join(', ')} trong art-source/${theme}`);
    process.exit(1);
  }
}
for (const file of files) {
  const num = file.slice(0, file.indexOf('-'));
  const to = rule.names ? rule.names[num] : file.replace(/^\d+-/, '').replace(/\.\w+$/, '');
  if (!to) continue;
  const meta = await sharp(path.join(SRC, file)).metadata();
  let img = sharp(path.join(SRC, file)).ensureAlpha();
  if (meta.hasAlpha) {
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
    for (let s0 = 0; s0 < n; s0++) {
      if (data[s0 * 4 + 3] === 0 || comp[s0] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      comp[s0] = id;
      stack.push(s0);
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
    // ảnh trang trí rời rạc (nhiều mảng nhỏ có chủ ý) thì không bỏ mảng rời
    const dropSmall = !rule.keepCanvas?.includes(to);
    let removed = 0;
    for (let i = 0; i < n; i++) {
      if (dropSmall && comp[i] >= 0 && sizes[comp[i]] < biggest * MIN_PART) {
        data[i * 4 + 3] = 0;
        removed++;
      }
    }
    if (removed) console.log(`${to}: bỏ ${sizes.filter((s1) => s1 < biggest * MIN_PART).length} mảng rời (${removed}px)`);
    img = sharp(data, { raw: { width: W, height: H, channels: 4 } });
    if ((rule.trim || rule.trimNames?.includes(to)) && dropSmall) img = sharp(await img.png().toBuffer()).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 });
  }
  const maxW = rule.maxW[to] ?? 1200;
  const outInfo = await img.resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(path.join(OUT, `${to}.webp`));
  console.log(`${to}.webp  ${outInfo.width}x${outInfo.height}`);
}
console.log('xong ->', path.relative(ROOT, OUT));
