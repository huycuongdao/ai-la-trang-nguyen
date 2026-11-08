/**
 * The look-and-feel themes of the stage. One list, shared by the server (which pack of questions to load)
 * and the pages (which screens to draw). To add a theme: add a line here, then give it screens in
 * src/game/components/theme-stages.tsx (the compiler will not build until you do). Steps: docs in CLAUDE.md, "Chủ đề giao diện".
 */
export interface ThemeInfo {
  /** Name shown on the control page */
  label: string;
  /**
   * Folder inside src/game/questions/ holding this theme's own questions (same .txt format as the general bank).
   * Leave it out to use the general bank (the .txt files directly inside src/game/questions/).
   * A folder that is missing or has no .txt files also falls back to the general bank.
   */
  questionPack?: string;
}

export const THEMES = {
  'dinh-lang': { label: 'Đình làng' },
  'village-yard': { label: 'Sân thi đầu làng' },
} as const satisfies Record<string, ThemeInfo>;

export type ThemeId = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeId = 'dinh-lang';
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const isThemeId = (x: unknown): x is ThemeId => typeof x === 'string' && x in THEMES;
