import { useEffect, useRef } from 'react';
import type { SayEvent } from '../../live/types';
import { voice } from '../../live/utils/voice';
import type { Role } from '../../live/context/RoleContext';
import type { AnyView } from '../engine/view-types';
import { sfx } from '../audio/sfx';
import { post } from '../utils/stage-api';

/**
 * The stage page is the speaker: the server decides what to say and sends `say` lines;
 * this plays them through the voice queue and reports each one finished (or failed) with POST /api/game/spoken.
 * The server sends `say` lines only to the stage page opened last, and marks that page's `view` with `audio: true`,
 * so any other stage page stays silent.
 */
export function useStageAudio(role: Role) {
  const isStage = role.role === 'stage';
  const prev = useRef<AnyView | null>(null);

  // Sound effects and music follow the game picture
  useEffect(() => {
    if (!isStage) return;
    if (role.muted) sfx.volume = sfx.musicVolume = 0;
    sfx.loadFiles();
  }, [isStage, role.muted]);

  const onSay = (s: SayEvent) => {
    if (!isStage) return;
    if ('stop' in s) return voice.stop();
    if ('prefetch' in s) return voice.prefetch(s.text);
    voice.say(s.text, s.priority, () => void post('/api/game/spoken', { id: s.id }));
  };

  const onView = (v: AnyView) => {
    if (!isStage) return;
    if (v.audio) sfx.watch(prev.current, v, voice.busy);
    else sfx.music('tat', false); // trang phụ: tắt nhạc
    prev.current = v;
  };

  return { onSay, onView };
}
