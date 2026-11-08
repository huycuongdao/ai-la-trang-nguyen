// Snapshot / restore. Run: npx tsx src/game/engine/room-snapshot.test.ts
//
// KyThi fields and how each is saved:
//   serialised: phase, endsAt, shownAt, idx, cauList (ids + option order; math questions whole), answers, counts, recent,
//               ketQua, skew, skewN, events, siTu, gioiChon, mienChon, tuan, trangTruoc, trangMoi, cuu, dauTruoc,
//               dauBaoCau, mienBaoCau, quaCho, qua, nhacDa, khach
//   derived:    cau, laLatKeo, cauSo (from idx and cauList); ans per question (from its option order)
//   reset:      rand (a new one is passed in); used (lives in used-questions.json); bank (passed to the constructor)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOM_RESUME_WINDOW_MS } from '../config';
import { loadRoom, saveRoom } from '../../server/room-store';
import { KyThi, type Phase } from './exam';
import { runScenario } from './golden-scenario';

// Cutting the golden game at every phase and resuming must end exactly like the uninterrupted game.
const whole = JSON.parse(JSON.stringify(runScenario()));
const phases: Phase[] = ['vong', 'doc', 'hoi', 'chot', 'dapAn', 'bangVang', 'vinhQuy'];
for (const phase of phases) {
  const resumed = JSON.parse(JSON.stringify(runScenario(phase)));
  assert.deepEqual(resumed, whole, `round differs after a restart in phase ${phase}`);
}

// Wrong version or a question the bank no longer has: restore refuses and changes nothing.
const k = new KyThi([]);
assert.equal(k.restore({ version: 2 } as never), false);
const snap = new KyThi([]).snapshot(0);
snap.cau = [{ id: 'gone|x', opts: ['a', 'b', 'c', 'd'], vong: 0 }];
assert.equal(k.restore(snap), false);
assert.equal(k.phase, 'cho');

// Resume window: 9 minutes resumes, 11 minutes does not and the file is kept once as room.expired.json.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'room-'));
const file = path.join(dir, 'room.json');
const saved = new KyThi([]).snapshot(1_000_000);
saveRoom(saved, file);
assert.ok(loadRoom(1_000_000 + 9 * 60_000, file));
assert.equal(ROOM_RESUME_WINDOW_MS, 10 * 60_000);
assert.equal(loadRoom(1_000_000 + 11 * 60_000, file), null);
assert.deepEqual(fs.readdirSync(dir), ['room.expired.json']);
fs.rmSync(dir, { recursive: true });
console.log('room-snapshot: OK');
