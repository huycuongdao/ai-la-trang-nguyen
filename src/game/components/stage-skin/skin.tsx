import { createContext, useContext, type ReactNode } from 'react';

/**
 * A skin = one set of 14 pictures plus the numbers that say where they go on the 1080x1920 screen.
 * The screens in this folder (exam-stage, elimination-stage) draw any skin, so a new theme made from the
 * same 14 slots needs only a new file in skins/ (see CLAUDE.md, "Chủ đề giao diện"). Run
 * `node tools/measure-theme-art.mjs <theme>` to print the measured numbers (`size`, `inset`) for a new set of art.
 */
export type ArtKey =
  | 'background' | 'floor' | 'pavilion' | 'titleSign' | 'host' | 'gongClock' | 'questionSign'
  | 'answerFrame' | 'mat' | 'avatarRing' | 'namePlate' | 'avatarMale' | 'avatarFemale' | 'cloudBorder';

/** [left, top, right, bottom] in pixels of the source picture */
export type Box = readonly [number, number, number, number];
type Pos = { x: number; y: number };

export interface Skin {
  /** Folder under public/assets/ */
  id: string;
  art: Record<ArtKey, string>;
  /** Source size [w, h] of the pictures whose shape matters */
  size: Record<'pavilion' | 'titleSign' | 'host' | 'gongClock' | 'questionSign' | 'answerFrame' | 'namePlate' | 'avatarRing', readonly [number, number]>;
  /** Where things sit on screen (design pixels). `w` = drawn width, height follows the picture's shape */
  layout: {
    title: Pos & { w: number };
    pavilion: Pos & { w: number };
    question: Pos & { w: number };
    gong: Pos & { w: number };
    answers: Pos & { w: number; gap: number; rowGap: number };
    status: Pos & { w: number; h: number };
    mat: Pos & { w: number; h: number };
    host: Pos & { h: number };
    /** Floor picture top, cloud strip top and height */
    ground: { floorY: number; cloudY: number; cloudH: number };
    /** Small signs left and right of the title */
    sideSigns: { left: Pos; right: Pos; w: number; pills: Pos };
    leaderboard: Pos & { w: number; h: number };
    gift: Pos & { w: number };
    counter: Pos & { w: number; h: number };
    /** Red "HẾT GIỜ!" stamp, and the "−N ✕" badge of the elimination mode */
    stamp: Pos & { w: number; h: number };
    outBadge: Pos & { h: number };
  };
  /** Measured inside the source pictures */
  inset: {
    /** Writable area of the question sign */
    questionText: Box;
    /** Round face of the gong clock where the number goes: centre and diameter */
    gongDisc: { cx: number; cy: number; d: number };
    /** Letter circle and writable area of an answer frame */
    answerLetter: { x: number; y: number; d: number };
    answerText: Box;
    /** Circle of the avatar ring that a photo fills (centre, diameter) */
    avatarCircle: { cx: number; cy: number; d: number };
  };
  /** Trapezoid of the mat (fractions of the mat box) where people may sit: narrow at the far (top) row, wide at the near row */
  seatZone: { top: number; bottom: number; topL: number; topR: number; botL: number; botR: number };
  colors: {
    /** Dark text on paper, accent text on paper (titles) */
    ink: string;
    accent: string;
    gold: string;
    cream: string;
    /** Dark translucent panels */
    panel: string;
  };
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
export const artPaths = (id: string): Record<ArtKey, string> => ({
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
});
