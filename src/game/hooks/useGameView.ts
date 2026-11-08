import { useState } from 'react';
import type { LiveStatus } from '../../live/types';
import type { AnyView } from '../engine/view-types';
import { GAME } from '../config';

/** State the screens render: live status, game picture from the server, channel name, owner settings. */
export function useGameView() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<AnyView | null>(null);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const [caiDatGoc, setCaiDat] = useState({ tieuDe: '', tenOngDo: '' });
  const caiDat = { tieuDe: caiDatGoc.tieuDe || GAME.tieuDeMacDinh, tenOngDo: caiDatGoc.tenOngDo || GAME.tenOngDoMacDinh };
  return { status, setStatus, view, setView, channelName, setChannelName, setCaiDat, caiDat };
}
