/** What a speech director needs from the voice: lines go to the stage page, which plays them and reports back. */
export interface VoiceOut {
  say(text: string, priority?: boolean, done?: () => void): void;
  prefetch(text: string): void;
  stop(): void;
  readonly busy: boolean;
  readonly waiting: number;
  readonly waitingPriority: number;
}
