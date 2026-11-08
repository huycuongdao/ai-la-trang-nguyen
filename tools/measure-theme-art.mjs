// In ra các số đo của bộ ảnh một chủ đề để điền vào skin (src/game/components/stage-skin/skins/<chủ đề>.ts).
// Chạy sau khi đã `node tools/prepare-theme-art.mjs <chủ đề>`:  node tools/measure-theme-art.mjs <chủ đề>
// Các con số "inset" đo trong ảnh đã xuất (public/assets/<chủ đề>/), tính bằng pixel của ảnh đó. Nên mở thử trang stage để kiểm tra bằng mắt.
import sharp from 'sharp';
import path from 'node:path';

const theme = process.argv[2];
if (!theme) {
  console.error('Dùng:  node tools/measure-theme-art.mjs <chủ đề>');
  process.exit(1);
}
const DIR = path.resolve(import.meta.dirname, '..', 'public/assets', theme);

async function load(name) {
  const { data, info } = await sharp(path.join(DIR, `${name}.webp`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/** Hộp bao của vùng nối liền với điểm (sx, sy) mà `ok(pixel)` đúng */
function region({ data, W, H }, sx, sy, ok) {
  const at = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
  const seen = new Uint8Array(W * H);
  const stack = [Math.round(sy) * W + Math.round(sx)];
  if (!ok(at(stack[0]))) return null;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (!seen[j] && ok(at(j))) stack.push(j);
    }
  }
  return [x0, y0, x1 + 1, y1 + 1];
}

const paper = ([r, g, b, a]) => a > 200 && r > 200 && g > 170 && b > 110; // giấy / mặt chiêng màu kem
const hole = ([, , , a]) => a < 128; // lỗ trong suốt

const out = {};
const sized = {};
for (const k of ['pavilion', 'title-sign', 'host', 'gong-clock', 'question-sign', 'answer-frame', 'name-plate', 'avatar-ring']) {
  const { W, H } = await load(k);
  sized[k] = [W, H];
}
out.size = {
  pavilion: sized.pavilion, titleSign: sized['title-sign'], host: sized.host, gongClock: sized['gong-clock'],
  questionSign: sized['question-sign'], answerFrame: sized['answer-frame'], namePlate: sized['name-plate'], avatarRing: sized['avatar-ring'],
};

const q = await load('question-sign');
out['inset.questionText'] = region(q, q.W * 0.5, q.H * 0.62, paper);
const g = await load('gong-clock');
const disc = region(g, g.W * 0.5, g.H * 0.53, paper);
out['inset.gongDisc'] = disc && { cx: (disc[0] + disc[2]) / 2, cy: (disc[1] + disc[3]) / 2, d: disc[2] - disc[0] };
const a = await load('answer-frame');
out['inset.answerText (cả mặt giấy, chữ cái nằm trong; chỉnh tay cho vừa chữ)'] = region(a, a.W * 0.6, a.H * 0.5, paper);
const r = await load('avatar-ring');
const h = region(r, r.W * 0.5, r.H * 0.5, hole);
out['inset.avatarCircle (hơi lớn hơn lỗ để nằm dưới viền)'] = h && { cx: (h[0] + h[2]) / 2, cy: (h[1] + h[3]) / 2, d: Math.round((h[2] - h[0]) * 1.03) };
out['inset.answerLetter'] = 'đo bằng mắt: vòng tròn chữ cái trong ô đáp án, {x, y, d} theo pixel ảnh';

console.log(JSON.stringify(out, null, 1));
