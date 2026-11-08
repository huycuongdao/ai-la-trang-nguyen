import { useState } from 'react';
import type { LiveStatus } from '../../live/types';
import type { View } from '../engine/exam';
import { GAME } from '../config';

/** State the screens render: live status, game snapshot, channel name, owner settings. */
export function useGameView() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const [caiDatGoc, setCaiDat] = useState({ tieuDe: '', tenOngDo: '' });
  const caiDat = { tieuDe: caiDatGoc.tieuDe || GAME.tieuDeMacDinh, tenOngDo: caiDatGoc.tenOngDo || GAME.tenOngDoMacDinh };
  return { status, setStatus, view, setView, channelName, setChannelName, setCaiDat, caiDat };
}

export type GameViewState = ReturnType<typeof useGameView>;
