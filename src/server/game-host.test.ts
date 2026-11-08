// Run: npx tsx src/server/game-host.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME } from '../game/config';
import type { Ev, McQ } from '../game/engine/exam';
import { directRig, GOLDEN_START, goldenRand, loadGoldenBank, mulberry32, runScenario, type Rig } from '../game/engine/golden-scenario';
import { GameHost, type HostDeps } from './game-host';
import type { SavedRound } from './hosted-mode';
import { SPOKEN_ACK_FALLBACK_MS } from './spoken-queue';

type Say = { id?: number; text?: string; priority?: boolean; prefetch?: boolean; stop?: boolean };

function makeHost(bank: McQ[], opts: { stages?: () => number; load?: SavedRound; extra?: Partial<HostDeps> } = {}) {
  const clock = { t: GOLDEN_START };
  const said: Say[] = [];
  const views: unknown[] = [];
  const saved: SavedRound[] = [];
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
    loadRoom: () => opts.load ?? null,
    saveRoom: (snap) => saved.push(snap),
    ...opts.extra,
  };
  const host = new GameHost(deps);
  host.start();
  return { host, clock, said, views, saved };
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
// ---- 6. Elimination mode through the host ----
type ElimView = {
  mode: string; phase: string; con: number; conLai: number; soNguoi: number; dung: number;
  ghe: { id: string; name: string; alive: boolean }[];
  thang: { name: string } | null;
};
const lastView = (views: unknown[]) => views[views.length - 1] as ElimView;
const chatAs = (host: GameHost, clock: { t: number }, id: string, comment: string) =>
  host.onLiveEvent('chat', { username: id, nickname: id.toUpperCase(), avatar: '', comment, createTime: clock.t });
const PLAYERS = ['a', 'b', 'c', 'd'];

function elimToReading() {
  const r = makeHost(bank);
  assert.equal(r.host.setMode('elimination'), true); // the exam is waiting, so switching is allowed
  const step = (ms: number) => {
    r.clock.t += ms;
    r.host.tick();
  };
  step(250);
  assert.equal(lastView(r.views).mode, 'elimination');
  assert.equal(lastView(r.views).phase, 'cho');
  for (const id of PLAYERS) chatAs(r.host, r.clock, id, 'tham gia'); // sign up in the waiting room
  step(250);
  assert.equal(lastView(r.views).soNguoi, 4);
  r.host.command('custom', 'batdau');
  for (let i = 0; i < 40 && !r.said.some((s) => s.text?.startsWith('Câu 1.')); i++) step(250);
  const line = r.said.find((s) => s.id && s.text?.startsWith('Câu 1.'));
  assert.ok(line, 'question line sent to the stage');
  return { ...r, step, line: line! };
}

// the 5 s clock starts only after the question has been read aloud
{
  const { host, step, views, line } = elimToReading();
  for (let i = 0; i < 20; i++) step(250); // 5 s later: still reading
  assert.equal(lastView(views).phase, 'doc');
  assert.equal(host.spoken(line.id!), true);
  step(0);
  assert.equal(lastView(views).phase, 'hoi');
  assert.equal(lastView(views).con, 5);
  assert.equal(host.spoken(line.id!), false); // a repeated acknowledgement does nothing
}

// a full game: four players answer A, B, C, D, so exactly one is right; the other three are out and the right one wins
{
  const { host, clock, step, views, line } = elimToReading();
  host.spoken(line.id!);
  step(250);
  PLAYERS.forEach((id, i) => chatAs(host, clock, id, 'ABCD'[i]));
  for (let i = 0; i < 80 && lastView(views).phase !== 'dapAn'; i++) step(250);
  const v = lastView(views);
  assert.equal(v.phase, 'dapAn');
  assert.equal(v.conLai, 1);
  assert.equal(v.ghe.filter((g) => !g.alive).length, 3); // the three losers are still drawn during the reveal
  const winner = PLAYERS[v.dung].toUpperCase();
  for (let i = 0; i < 80 && lastView(views).phase !== 'vinhDanh'; i++) step(250);
  assert.equal(lastView(views).phase, 'vinhDanh');
  assert.equal(lastView(views).thang?.name, winner);
  assert.equal(lastView(views).ghe.filter((g) => g.alive).length, 1); // one player is left on the mat
}

// switching mode is refused while a game runs, unless forced
{
  const { host, step, views } = elimToReading();
  assert.equal(host.setMode('exam'), false);
  host.command('custom', 'mode:exam');
  assert.equal(host.mode, 'elimination');
  step(250);
  assert.equal(lastView(views).mode, 'elimination');
  assert.equal(host.setMode('exam', true), true);
  assert.equal(host.mode, 'exam');
  step(250);
  assert.equal(lastView(views).mode, 'exam');
  assert.equal(lastView(views).phase, 'cho');
  // and the other way round: a running exam game cannot be switched away from
  host.command('custom', 'batdau');
  step(250);
  assert.equal(host.setMode('elimination'), false);
  host.command('custom', 'mode:elimination');
  assert.equal(host.mode, 'exam');
}

// a restart in the middle of an elimination game resumes that mode and reads the question again
{
  const first = elimToReading();
  const snap = first.saved[first.saved.length - 1];
  assert.equal(snap.mode, 'elimination');
  assert.equal(lastView(first.views).phase, 'doc');
  const again = makeHost(bank, { load: snap });
  assert.equal(again.host.mode, 'elimination');
  const reread = again.said.find((s) => s.id && s.text?.startsWith('Câu 1.'));
  assert.ok(reread, 'the unfinished question is read again');
  again.host.tick();
  assert.equal(lastView(again.views).phase, 'doc');
  again.host.spoken(reread!.id!);
  again.clock.t += 250;
  again.host.tick();
  assert.equal(lastView(again.views).phase, 'hoi');
}
// ---- 7. The operator's mode and player cap are remembered and applied at start ----
{
  const modes: string[] = [];
  const caps: number[] = [];
  const r = makeHost(bank, { extra: { initialMode: 'elimination', initialMaxNguoi: 100, saveMode: (m) => modes.push(m), saveMaxNguoi: (n) => caps.push(n) } });
  assert.equal(r.host.mode, 'elimination'); // nothing to resume: starts in the remembered mode
  assert.equal(r.host.cap, 100);
  r.host.tick();
  assert.equal((r.views[r.views.length - 1] as { mode: string; maxNguoi: number }).maxNguoi, 100);
  r.host.command('custom', 'cap:50');
  assert.equal(r.host.cap, 50);
  assert.deepEqual(caps, [50]);
  r.host.command('custom', 'cap:abc'); // ignored
  assert.deepEqual(caps, [50]);
  r.host.command('custom', 'mode:exam');
  assert.equal(r.host.mode, 'exam');
  assert.deepEqual(modes, ['exam']);
}

console.log('game-host: OK');
