/// <reference types="vite/client" />
import { useState } from 'react';
import { voice } from '../../live/utils/voice';
import { useRole } from '../../live/context/RoleContext';
import { sfx } from '../audio/sfx';
import { KyThi, parseMc } from '../engine/exam';
import { useGameView } from './useGameView';
import { useStageAudio } from './useStageAudio';
import { useStageEngine } from './useStageEngine';

// Mọi file câu hỏi trong src/game/questions/ (mỗi chủ đề 1 file)
const bankFiles = import.meta.glob<string>('../questions/*.txt', { query: '?raw', import: 'default', eager: true });
const BANK = Object.values(bankFiles).flatMap((t) => parseMc(t));

/**
 * Trang stage chạy game thật (KyThi) và gửi ảnh chụp lên server.
 * Trang điều khiển chỉ vẽ lại ảnh chụp đó, không tự chạy game (tránh 2 bộ câu khác nhau).
 */
export function useGame() {
  const role = useRole();
  // runs once, before the first effect: only an unmuted stage page may speak
  useState(() => voice.configure({ allowed: role.role === 'stage' && !role.muted }));
  const view = useGameView();
  const [room] = useState(() => new KyThi(BANK));
  if (import.meta.env.DEV) Object.assign(window as any, { __room: room, __sfx: sfx }); // để thử các màn trong trình duyệt
  const audio = useStageAudio(room, view.channelName);
  useStageEngine(room, audio, role, view);
  return { status: view.status, channelName: view.channelName, view: view.view, caiDat: view.caiDat };
}

export type GameState = ReturnType<typeof useGame>;
export { TEN_MIEN } from './useStageAudio';
