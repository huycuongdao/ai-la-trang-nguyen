import { useState } from 'react';
import type { LiveStatus } from '../../live/types';
import type { AnyView } from '../engine/view-types';
import { GAME } from '../config';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../themes';
import { applyThemeWords } from '../theme-words';

/** State the screens render: live status, game picture from the server, channel name, owner settings. */
export function useGameView(urlTheme: ThemeId | null) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<AnyView | null>(null);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const [caiDatGoc, setCaiDat] = useState({ tieuDe: '', tenOngDo: '', theme: '' });
  // the link's ?theme= beats the control page's choice; the wording (host name, titles...) follows it before anything is drawn
  const theme = urlTheme ?? (isThemeId(caiDatGoc.theme) ? caiDatGoc.theme : DEFAULT_THEME);
  applyThemeWords(theme);
  const caiDat = { tieuDe: caiDatGoc.tieuDe || GAME.tieuDeMacDinh, tenOngDo: caiDatGoc.tenOngDo || GAME.tenOngDoMacDinh, theme };
  return { status, setStatus, view, setView, channelName, setChannelName, setCaiDat, caiDat };
}
