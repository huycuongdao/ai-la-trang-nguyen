import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { Mood } from './common';

/**
 * A skin = the numbers that say where things go on the 1080x1920 screen (`layout`, `seatZone`, `colors`...)
 * plus a `kit`: the look pieces (scene, host, question sign, clock, answer frames, seats...) drawn from the
 * theme's own pictures. The screens in this folder (exam-stage, elimination-stage) hold the game logic and draw
 * any skin through its kit, so a new theme is a new skin file (and kit, when its pieces look different).
 * See CLAUDE.md, "Chủ đề giao diện". `node tools/measure-theme-art.mjs <theme>` prints measurements for a set of art.
 */

/** Slots of the 14-picture set made like art-source/dinh-lang (other kits may use other names) */
export type DinhArtKey =
  | 'background' | 'floor' | 'pavilion' | 'titleSign' | 'host' | 'gongClock' | 'questionSign'
  | 'answerFrame' | 'mat' | 'avatarRing' | 'namePlate' | 'avatarMale' | 'avatarFemale' | 'cloudBorder' | 'steps';

/** [left, top, right, bottom] in pixels of the source picture */
export type Box = readonly [number, number, number, number];
type Pos = { x: number; y: number };

export interface Skin {
  /** Folder under public/assets/ */
  id: string;
  art: Record<string, string>;
  /** Source size [w, h] of the pictures whose shape matters */
  size: Record<string, readonly [number, number]>;
  /**
   * Where things sit on screen (design pixels). The keys below are used by the screens; a kit may add its own
   * (title, pavilion, question, gong, answers, host, ground...) and read them in its pieces.
   */
  layout: {
    /** Line of text between the answers and the players */
    status: Pos & { w: number; h: number };
    /** Where the players sit */
    mat: Pos & { w: number; h: number };
    /** Top 10 board */
    leaderboard: Pos & { w: number; h: number };
    /** Big "players left" board of the elimination mode */
    counter: Pos & { w: number; h: number };
    /** Red "HẾT GIỜ!" stamp, and the "−N ✕" badge of the elimination mode */
    stamp: Pos & { w: number; h: number };
    outBadge: Pos & { h: number };
  } & Record<string, any>;
  /** Measured inside the source pictures (what is here depends on the kit) */
  inset: Record<string, any>;
  /** How much room a person takes on the mat, as multiples of the token size; `body` = height of the token itself */
  seatCell: { nameMin: number; named: { w: number; h: number; body: number }; plain: { w: number; h: number; body: number } };
  /** Trapezoid of the mat (fractions of the mat box) where people may sit: narrow at the far (top) row, wide at the near row */
  seatZone: { top: number; bottom: number; topL: number; topR: number; botL: number; botR: number };
  kit: Kit;
  /** How many people the mat shows at most (the rest still play and score) */
  maxSeats: number;
  /** A kit that lays its people out on its own (instead of rows inside `seatZone`) */
  seatLayout?: (n: number, maxSize?: number) => Seats;
  /** Pieces the screens leave out for this theme */
  hide?: { leaderboard?: boolean; gift?: boolean; counter?: boolean };
  colors: {
    /** Dark text on paper, accent text on paper (titles) */
    ink: string;
    accent: string;
    gold: string;
    cream: string;
    /** Text for "good" / "bad" numbers (points gained, points lost) and bars, readable on the question sign */
    good: string;
    bad: string;
    /** Dark translucent panels */
    panel: string;
  };
}

export interface Seats {
  size: number;
  ten: boolean;
  pos: { x: number; y: number }[]; // top-left of each token, relative to the mat
}

export type AnswerState = { right: boolean; dim: boolean; wiped: boolean };

export interface HeaderProps {
  /** "CÂU 7" or a state like "GHI TÊN" */
  main: string;
  /** Total next to it ("20"), when there is one */
  total?: string;
  /** Name of the exam, or "LẬT KÈO ×2" */
  label: string;
  /** Short status for kits that show it next to the question number ("CÒN LẠI 8/30") */
  detail?: string;
  gold?: boolean;
  /** Progress through the exam rounds: one entry per round (done / now / todo) */
  rounds?: ('done' | 'now' | 'todo')[];
}

export interface SeatProps {
  id: string; name: string; avatar: string; gioi?: 'nam' | 'nu'; size: number; ten: boolean; x: number; y: number;
  crown?: string; out?: boolean; right?: boolean; gain?: number; jump?: boolean;
  /** Points, for kits that show them next to the name */
  score?: number;
}

/** The look pieces a theme draws. The screens call these; each theme implements them with its own pictures. */
export interface Kit {
  /** Background and everything that does not change from round to round */
  Scene: ComponentType;
  Header: ComponentType<HeaderProps>;
  Host: ComponentType<{ mood: Mood; ten: string }>;
  QuestionSign: ComponentType<{ children: ReactNode }>;
  /** Countdown: `value` seconds left of `total` (null = hidden) */
  GongClock: ComponentType<{ value: number | null; total: number; low?: boolean }>;
  /** `len` = number of characters of the answer (lets a kit pick the text size) */
  AnswerFrame: ComponentType<{ index: number; delay: number; state: AnswerState; len: number; children: ReactNode }>;
  /** The line of text between the answers and the players (who answered, the result...) */
  StatusLine: ComponentType<{ children: ReactNode }>;
  /** Box with the rules of the game (title and lines of [text, highlighted ending]); a kit without it shows none */
  Rules?: ComponentType<{ title: string; lines: [string, string][] }>;
  /** Where the players sit; children use its top-left corner as origin */
  Mat: ComponentType<{ children: ReactNode }>;
  Seat: ComponentType<SeatProps>;
  RingAvatar: ComponentType<{ avatar: string; gioi?: 'nam' | 'nu'; id: string; size: number }>;
  NamePlate: ComponentType<{ name: string; w: number; gold?: boolean }>;
  GiftBoard: ComponentType;
}

const SkinContext = createContext<Skin | null>(null);

export function SkinProvider({ skin, children }: { skin: Skin; children: ReactNode }) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

export function useSkin(): Skin {
  const skin = useContext(SkinContext);
  if (!skin) throw new Error('useSkin must be used inside SkinProvider');
  return skin;
}

/** Picture paths of a skin whose files were made by `node tools/prepare-theme-art.mjs <id>` */
export const artPaths = (id: string): Record<DinhArtKey, string> => ({
  background: `/assets/${id}/background.webp`,
  floor: `/assets/${id}/floor.webp`,
  pavilion: `/assets/${id}/pavilion.webp`,
  titleSign: `/assets/${id}/title-sign.webp`,
  host: `/assets/${id}/host.webp`,
  gongClock: `/assets/${id}/gong-clock.webp`,
  questionSign: `/assets/${id}/question-sign.webp`,
  answerFrame: `/assets/${id}/answer-frame.webp`,
  mat: `/assets/${id}/mat.webp`,
  avatarRing: `/assets/${id}/avatar-ring.webp`,
  namePlate: `/assets/${id}/name-plate.webp`,
  avatarMale: `/assets/${id}/avatar-male.webp`,
  avatarFemale: `/assets/${id}/avatar-female.webp`,
  cloudBorder: `/assets/${id}/cloud-border.webp`,
  steps: `/assets/${id}/steps-wide.webp`,
});
