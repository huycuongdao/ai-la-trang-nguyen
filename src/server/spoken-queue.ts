import type { VoiceOut } from './speech-director';

/**
 * No acknowledgement from the stage for a line that gates the question timer: carry on after this long.
 * Measured on a real stage: reading a question and its 4 answers took 16.3 s from the moment it was sent,
 * so 15 s would cut a normal read short. 25 s matches the engine's own cap (GAME.docMaxSec).
 */
export const SPOKEN_ACK_FALLBACK_MS = 25_000;
/** Lines nobody acknowledged are forgotten after this long */
const FORGET_MS = 90_000;

interface Pending {
  at: number;
  priority: boolean;
  done?: () => void;
}

/**
 * The server-side voice. A line is sent to the stage page as a `say` event; the stage plays it and answers with
 * `POST /api/game/spoken { id }`. The optional `done` callback runs when that acknowledgement arrives, or when the
 * fallback fires (no acknowledgement in time, or no stage page is connected at all).
 */
export class SpokenQueue implements VoiceOut {
  private pending = new Map<number, Pending>();
  private seq = 0;

  constructor(
    private emit: (event: string, data: unknown) => void,
    private stageCount: () => number,
    private now: () => number,
  ) {}

  say(text: string, priority = false, done?: () => void) {
    const t = text.trim();
    if (!t || this.stageCount() === 0) return done?.(); // nobody to hear it: do not wait
    const id = ++this.seq;
    this.pending.set(id, { at: this.now(), priority, done });
    this.emit('say', { id, text: t, priority });
  }

  prefetch(text: string) {
    if (text.trim() && this.stageCount() > 0) this.emit('say', { prefetch: true, text: text.trim() });
  }

  /** The stage finished (or failed to play) line `id`. Unknown or repeated ids are ignored. */
  ack(id: number) {
    const p = this.pending.get(id);
    if (!p) return false;
    this.pending.delete(id);
    if (p.done) console.log(`[giọng] đề đọc xong sau ${this.now() - p.at} ms (từ lúc gửi tới lúc trang stage báo lại)`);
    p.done?.();
    return true;
  }

  stop() {
    this.emit('say', { stop: true });
    this.releaseAll();
  }

  /** Called every tick: fallbacks, and cleanup when the stage page is gone */
  sweep() {
    if (this.stageCount() === 0) return this.releaseAll();
    const now = this.now();
    for (const [id, p] of [...this.pending]) {
      if ((p.done && now - p.at >= SPOKEN_ACK_FALLBACK_MS) || now - p.at >= FORGET_MS) {
        this.pending.delete(id);
        p.done?.();
      }
    }
  }

  private releaseAll() {
    const all = [...this.pending.values()];
    this.pending.clear();
    all.forEach((p) => p.done?.());
  }

  get busy() {
    return this.pending.size > 0;
  }
  get waiting() {
    return [...this.pending.values()].filter((p) => !p.priority).length;
  }
  get waitingPriority() {
    return [...this.pending.values()].filter((p) => p.priority).length;
  }
}
