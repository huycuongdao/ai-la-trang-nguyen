import { useEffect, useState } from 'react';
import { useLiveEvents } from '../../live/hooks/useLiveEvents';
import { useRole } from '../../live/context/RoleContext';
import { voice } from '../../live/utils/voice';
import { GAME } from '../config';
import { useGameView } from './useGameView';
import { useStageAudio } from './useStageAudio';

/**
 * The game runs on the server. Both pages draw the `view` it sends; the stage page also plays the lines it says.
 */
export function useGame() {
  const role = useRole();
  // runs once, before the first effect: only an unmuted stage page may speak
  useState(() => voice.configure({ allowed: role.role === 'stage' && !role.muted }));
  const v = useGameView();
  const audio = useStageAudio(role);

  useLiveEvents(
    {
      onStatus: v.setStatus,
      onView: (view) => {
        v.setView(view);
        audio.onView(view);
      },
      onSay: audio.onSay,
      onCaiDat: v.setCaiDat,
      onControl: (c) => {
        if (c.action === 'setName' && c.text) v.setChannelName(c.text);
        if (role.role === 'stage' && c.action === 'setRate' && c.text) voice.rate = Number(c.text) || 1;
      },
    },
    { stageId: role.stageId },
  );

  // common lines are read often: have the voice ready from the start
  useEffect(() => {
    if (role.role !== 'stage') return;
    const L = GAME.loi;
    [...L.hetGio, ...L.nhac, ...L.latKeo, ...L.cuuTro, ...L.thach, ...L.coVuSau].forEach((t) => voice.prefetch(t));
  }, [role.role]);

  return { status: v.status, channelName: v.channelName, view: v.view, caiDat: v.caiDat };
}

export type GameState = ReturnType<typeof useGame>;
