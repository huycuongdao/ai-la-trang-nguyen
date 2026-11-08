// Run: npx tsx src/server/sse-hub.test.ts
import assert from 'node:assert/strict';
import type { Express } from 'express';
import { createSseHub } from './sse-hub';

const hub = createSseHub();
let handler: (req: unknown, res: unknown) => void = () => {};
hub.register({ get: (_path: string, h: typeof handler) => (handler = h) } as unknown as Express, () => []);

function connect(role?: string) {
  const got: string[] = [];
  let close = () => {};
  handler(
    { query: role ? { role } : {}, on: (_: string, cb: () => void) => (close = cb) },
    { setHeader() {}, flushHeaders() {}, write: (s: string) => got.push(s) },
  );
  return { got, close: () => close() };
}
const events = (c: { got: string[] }, name: string) => c.got.filter((s) => s.startsWith(`event: ${name}\n`));

const control = connect();
const stageA = connect('stage');
const stageB = connect('stage'); // opened last: plays the sound
assert.equal(hub.stageCount(), 2);

// spoken lines reach only the stage opened last
hub.sendToAudioStage('say', { id: 1, text: 'xin chào', priority: true });
assert.equal(events(stageB, 'say').length, 1);
assert.equal(events(stageA, 'say').length, 0);
assert.equal(events(control, 'say').length, 0);

// the picture reaches everyone; stage pages learn whether they are the audio page
hub.broadcastView({ phase: 'hoi' });
assert.ok(events(stageB, 'view')[0].includes('"audio":true'));
assert.ok(events(stageA, 'view')[0].includes('"audio":false'));
assert.ok(!events(control, 'view')[0].includes('audio'));

// the newest stage closes: the previous one takes over
stageB.close();
hub.sendToAudioStage('say', { id: 2, text: 'tiếp', priority: false });
assert.equal(events(stageA, 'say').length, 1);
assert.equal(hub.stageCount(), 1);
stageA.close();
assert.equal(hub.stageCount(), 0);
hub.sendToAudioStage('say', { id: 3, text: 'không ai nghe', priority: false }); // nobody there: no error
control.close();
console.log('sse-hub: OK');
