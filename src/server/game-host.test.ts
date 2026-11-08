// Run: npx tsx src/server/game-host.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME } from '../game/config';
import type { Ev, McQ } from '../game/engine/exam';
import { directRig, GOLDEN_START, goldenRand, loadGoldenBank, mulberry32, runScenario, type Rig } from '../game/engine/golden-scenario';
import { GameHost, type HostDeps } from './game-host';
import { SPOKEN_ACK_FALLBACK_MS } from './spoken-queue';

type Say = { id?: number; text?: string; priority?: boolean; prefetch?: boolean; stop?: boolean };

function makeHost(bank: McQ[], opts: { stages?: () => number } = {}) {
  const clock = { t: GOLDEN_START };
  const said: Say[] = [];
  const views: unknown[] = [];
  const deps: HostDeps = {
    bank,
    now: () => clock.t,
    rand: goldenRand(),
    speechRand: mulberry32(7),
    emit: (event, data) => {
      if (event === 'say') said.push(data as Say);
      if (event === 'view') views.push(data);
    },
    stageCount: opts.stages ?? (() => 1),
    channelName: () => 'Kenh Thu',
    used: {},
    saveUsed: () => {},
    addWeekly: () => [],
    weeklyTop: () => [],
    loadRoom: () => null,
    saveRoom: () => {},
  };
  const host = new GameHost(deps);
  host.start();
  return { host, clock, said, views };
}

// ---- 1. The golden round run through the host gives the same ranking, scores and events as the bare engine ----
function hostRig(bank: McQ[]): Rig {
  const { host, clock, said } = makeHost(bank);
  const events: Ev[] = [];
  const lay = host.room.lay.bind(host.room);
  host.room.lay = () => {
    const e = lay();
    events.push(...e);
    return e;
  };
  const sentAt = new Map<number, number>();
  const acked = new Set<number>();
  return {
    room: () => host.room,
    chat: (u, comment, createTime, t) => {
      clock.t = t;
      host.onLiveEvent('chat', { username: u.id, nickname: u.name, avatar: u.avatar, comment, createTime });
    },
    gift: (u, coins, t) => {
      clock.t = t;
      host.onLiveEvent('gift', { username: u.id, nickname: u.name, avatar: u.avatar, giftName: 'Rose', giftId: 1, diamondCount: coins, repeatCount: 1 });
    },
    tim: (n, t) => {
      clock.t = t;
      host.onLiveEvent('like', { username: 'x', nickname: 'x', likeCount: n, totalLikes: n });
    },
    boCau: (t) => {
      clock.t = t;
      host.command('custom', 'bocau');
    },
    speechDone: (t) => {
      // the stage finishes reading every line 2 s after it was sent
      clock.t = t;
      for (const s of said) if (s.id && !sentAt.has(s.id)) sentAt.set(s.id, t - 0);
      for (const [id, at] of sentAt) if (!acked.has(id) && t >= at + 2000) (acked.add(id), host.spoken(id));
    },
    tick: (t) => {
      clock.t = t;
      host.tick();
      for (const s of said) if (s.id && !sentAt.has(s.id)) sentAt.set(s.id, t);
    },
    events: () => events.splice(0),
  };
}
const bank = loadGoldenBank();
const viaEngine = JSON.parse(JSON.stringify(runScenario()));
const viaHost = JSON.parse(JSON.stringify(runScenario(undefined, hostRig)));
assert.deepEqual(viaHost.ranking, viaEngine.ranking);
assert.deepEqual(viaHost.scores, viaEngine.scores);
assert.deepEqual(viaHost.transitions, viaEngine.transitions);
assert.deepEqual(viaHost.diemMien, viaEngine.diemMien);
const fixture = JSON.parse(fs.readFileSync(new URL('../game/engine/fixtures/golden-run.json', import.meta.url), 'utf8'));
assert.deepEqual(viaHost.ranking, fixture.ranking);
assert.deepEqual(viaHost.scores, fixture.scores);
void directRig;

// ---- 2. The answer timer starts only after the question has been read aloud (spoken) ----
function toReading() {
  const r = makeHost(bank);
  r.host.command('custom', 'batdau');
  const step = (ms: number) => {
    r.clock.t += ms;
    r.host.tick();
  };
  for (let i = 0; i < 100 && r.host.room.phase !== 'doc'; i++) step(250);
  assert.equal(r.host.room.phase, 'doc');
  const line = [...r.said].reverse().find((s) => s.id && s.text?.startsWith('Câu 1.'));
  assert.ok(line, 'question line sent to the stage');
  return { ...r, step, line: line! };
}

{
  const { host, step, line } = toReading();
  for (let i = 0; i < 20; i++) step(250); // 5 s later: still reading
  assert.equal(host.room.phase, 'doc');
  assert.equal(host.spoken(line.id!), true);
  assert.equal(host.room.phase, 'hoi'); // the 4 answers appear and the clock starts now
  assert.equal(host.spoken(line.id!), false); // a repeated acknowledgement does nothing
  assert.equal(host.spoken(999_999), false); // so does an unknown id
  assert.equal(host.room.phase, 'hoi');
}

// ---- 3. No acknowledgement: carry on after SPOKEN_ACK_FALLBACK_MS ----
{
  const { host, step } = toReading();
  for (let t = 0; t < SPOKEN_ACK_FALLBACK_MS - 500; t += 250) step(250);
  assert.equal(host.room.phase, 'doc');
  for (let i = 0; i < 4; i++) step(250);
  assert.equal(host.room.phase, 'hoi');
  assert.ok(GAME.docMaxSec * 1000 >= SPOKEN_ACK_FALLBACK_MS); // never later than the engine's own cap
}

// ---- 4. No stage page connected: nothing to wait for ----
{
  let stages = 1;
  const r = makeHost(bank, { stages: () => stages });
  r.host.command('custom', 'batdau');
  stages = 0;
  for (let i = 0; i < 100 && r.host.room.phase !== 'hoi'; i++) {
    r.clock.t += 250;
    r.host.tick();
  }
  assert.equal(r.host.room.phase, 'hoi');
  assert.equal(r.said.filter((s) => s.id).length, 0); // nothing is sent when nobody can hear it
}

// ---- 5. Every tick sends the picture of the game to the pages ----
{
  const r = makeHost(bank);
  r.host.tick();
  assert.equal(r.views.length, 1);
  assert.equal((r.views[0] as { phase: string }).phase, 'cho');
}
console.log('game-host: OK');
