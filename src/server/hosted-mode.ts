import type { ChatEvent, GiftEvent, LikeEvent, UserEvent } from '../live/types';
import type { McQ } from '../game/engine/exam';
import type { SpokenQueue } from './spoken-queue';

/** The game modes the host can run. Only one is active at a time. */
export type GameMode = 'exam' | 'elimination';

/** Fields every saved round has. A snapshot without `mode` is an exam round. */
export interface SavedRound {
  version: 1;
  savedAt: number;
  mode?: GameMode;
}

/** What the host needs from a game engine, whatever its rules. */
export interface ModeEngine {
  readonly phase: string;
  /** Go to the waiting phase (countdown or lobby) */
  cho(now: number): void;
  tick(now: number): void;
  /** The picture of the game for the pages (plain JSON) */
  view(now: number): object;
  snapshot(now: number): SavedRound;
  /** Switch to another question bank (only called while waiting for a game) */
  setBank(bank: McQ[]): void;
}

/** What the host needs from the master of ceremonies of a mode. */
export interface ModeDirector {
  warmUp(now: number): void;
  /** Runs after every engine tick: speaks the engine's events and fills quiet moments */
  afterTick(now: number): void;
  onChat(e: ChatEvent, now: number): void;
  onGift(e: GiftEvent, now: number): void;
  onMember(e: UserEvent): void;
  onFollow(e: UserEvent): void;
  onLike(e: LikeEvent): void;
  command(action: string, text: string | undefined, now: number): void;
}

/** One mode, ready to run: its engine, its director, and how to put a saved round back. */
export interface ModeRunner {
  name: GameMode;
  engine: ModeEngine;
  director: ModeDirector;
  /** Put a saved round back and do whatever the mode needs to carry on (e.g. read the question again). False = not usable. */
  restore(saved: SavedRound, now: number): boolean;
}

/** What a mode needs to be built by the host (see mode-runners.ts) */
export interface RunnerContext {
  bank: McQ[];
  now: () => number;
  rand: () => number;
  speechRand: () => number;
  voice: SpokenQueue;
  channelName: () => string;
  used: Record<string, number>;
  saveUsed: () => void;
}
