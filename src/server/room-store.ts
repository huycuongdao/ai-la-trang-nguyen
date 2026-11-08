/**
 * data/room.json: the saved state of the round in progress (written atomically every few seconds while a round is live).
 * Format: a RoomSnapshot (src/game/engine/exam.ts): { version, savedAt, phase, endsAt, idx, cau, answers, siTu, ... }.
 * A snapshot older than ROOM_RESUME_WINDOW_MS is not resumed; it is kept once as room.expired.json.
 */
import fs from 'fs';
import path from 'path';
import { ROOM_RESUME_WINDOW_MS } from '../game/config';
import type { RoomSnapshot } from '../game/engine/exam';
import { dataPath, readJson, writeJsonAtomic } from './store';

const ROOM_FILE = dataPath('room.json');

export function saveRoom(snapshot: RoomSnapshot, file = ROOM_FILE) {
  writeJsonAtomic(file, snapshot);
}

/** The saved round if it is fresh enough; otherwise null (and the old file moves to room.expired.json). */
export function loadRoom(now: number, file = ROOM_FILE): RoomSnapshot | null {
  const snap = readJson<RoomSnapshot>(file);
  if (!snap) return null;
  if (snap.version === 1 && typeof snap.savedAt === 'number' && now - snap.savedAt <= ROOM_RESUME_WINDOW_MS) return snap;
  try {
    fs.renameSync(file, path.join(path.dirname(file), 'room.expired.json'));
  } catch {
    // keep going: an old file left behind is harmless
  }
  return null;
}
