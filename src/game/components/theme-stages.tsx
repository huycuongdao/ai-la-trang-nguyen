import type { ComponentType } from 'react';
import type { GameState } from '../hooks/useGame';
import type { ThemeId } from '../themes';
import { GameStage } from './GameStage';
import { EliminationStage } from './EliminationStage';
import { ExamStageSkinned } from './stage-skin/exam-stage';
import { EliminationStageSkinned } from './stage-skin/elimination-stage';
import { SkinProvider, type Skin } from './stage-skin/skin';
import { DINH_LANG } from './stage-skin/skins/dinh-lang';
import { VUA_KHAN_DAI } from './stage-skin/skins/vua-khan-dai';

/** The two screens of a theme: one per game mode */
export interface StageSet {
  Exam: ComponentType<{ game: GameState }>;
  Elimination: ComponentType<{ game: GameState }>;
}

/** A theme drawn by the shared screens in stage-skin/ with its own skin: the only thing a new look made from the same 14 pictures needs */
const skinned = (skin: Skin): StageSet => ({
  Exam: ({ game }) => <SkinProvider skin={skin}><ExamStageSkinned game={game} /></SkinProvider>,
  Elimination: ({ game }) => <SkinProvider skin={skin}><EliminationStageSkinned game={game} /></SkinProvider>,
});

/**
 * Every theme in src/game/themes.ts must have its screens here (the type checker enforces it).
 * A theme with a different layout can point at its own two components instead of `skinned(...)`.
 */
export const STAGES: Record<ThemeId, StageSet> = {
  'dinh-lang': skinned(DINH_LANG),
  'vua-khan-dai': skinned(VUA_KHAN_DAI),
  'village-yard': { Exam: GameStage, Elimination: EliminationStage },
};

