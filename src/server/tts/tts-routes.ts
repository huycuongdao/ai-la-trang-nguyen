import express from 'express';
import type { Express } from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Giọng đọc. Đổi ở đây nếu game cần giọng khác (vi-VN-HoaiMyNeural = nữ)
const TTS_VOICE = process.env.TTS_VOICE || 'vi-VN-NamMinhNeural';
const TTS_PITCH = process.env.TTS_PITCH || '-4%';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function splitText(text: string, max = 190): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '));
    if (cut < max / 2) cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '));
    if (cut < max / 2) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function edgeTts(text: string, rate: number): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(TTS_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), { rate: `${Math.round((rate - 1) * 100)}%`, pitch: TTS_PITCH });
    const chunks: Buffer[] = [];
    const read = (async () => {
      for await (const c of audioStream) chunks.push(c as Buffer);
    })();
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Edge TTS timeout')), 20000));
    await Promise.race([read, timeout]);
    if (chunks.length === 0) throw new Error('Edge TTS không trả âm thanh');
    return Buffer.concat(chunks);
  } finally {
    tts.close();
  }
}

async function googleTts(text: string): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const chunk of splitText(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });
    if (!r.ok) throw new Error(`Google TTS lỗi ${r.status}`);
    parts.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

const ttsCache = new Map<string, Buffer>();
// Giọng VieNeu (E:\02_AI\VieNeu-TTS chạy server ở cổng 8000, card đồ hoạ tạo giọng).
// Vừa tạo vừa phát nên gần như không phải chờ. VieNeu chưa bật hoặc lỗi thì tự quay về giọng Edge.
// Đổi giọng: đặt biến VIENEU_VOICE (vd "Thiện Minh"); để trống = chỉ dùng Edge.
const VIENEU_URL = process.env.VIENEU_URL || 'http://127.0.0.1:8000';
const VIENEU_VOICE = process.env.VIENEU_VOICE ?? 'Adam bựa';
const vieneuCache = new Map<string, Buffer>();
async function vieneuTts(text: string, res: express.Response): Promise<boolean> {
  const cached = vieneuCache.get(text);
  if (cached) {
    res.setHeader('Content-Type', 'audio/wav');
    res.send(cached);
    return true;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000); // chỉ chờ tối đa 5 giây cho tới byte đầu
  try {
    const r = await fetch(`${VIENEU_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'vieneu', voice: VIENEU_VOICE, input: text, response_format: 'wav' }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    const parts: Buffer[] = [];
    for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
      const b = Buffer.from(chunk);
      parts.push(b);
      res.write(b);
    }
    res.end();
    vieneuCache.set(text, Buffer.concat(parts));
    if (vieneuCache.size > 100) vieneuCache.delete(vieneuCache.keys().next().value!);
    return true;
  } catch (err) {
    clearTimeout(timer);
    if (res.headersSent) {
      res.end();
      return true;
    }
    console.warn('[VieNeu lỗi, dùng giọng Edge]', err instanceof Error ? err.message : err);
    return false;
  }
}

export function registerTts(app: Express) {
  app.get('/api/tts', async (req, res) => {
    try {
      const raw = String(req.query.text || '').trim().slice(0, 1500);
      if (!raw) return res.status(400).send('Thiếu text');
      const rate = Math.min(1.5, Math.max(0.5, Number(req.query.rate) || 1));
      if (VIENEU_VOICE && (await vieneuTts(raw, res))) return;
      // Edge / Google không hiểu thẻ cảm xúc [cười] [thở dài]...: bỏ đi để khỏi đọc thành chữ
      const text = raw.replace(/\[[^\]]*\]\s*/g, '').trim();
      if (!text) return res.status(204).end();
      const key = `${rate}|${text}`;
      let audio = ttsCache.get(key);
      if (!audio) {
        try {
          audio = await edgeTts(text, rate);
        } catch (err) {
          console.warn('Edge TTS lỗi, chuyển Google:', err instanceof Error ? err.message : err);
          audio = await googleTts(text);
        }
        ttsCache.set(key, audio);
        if (ttsCache.size > 200) ttsCache.delete(ttsCache.keys().next().value!);
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audio);
    } catch (err) {
      console.error('TTS lỗi:', err);
      res.status(500).json({ error: 'TTS failed' });
    }
  });
}
