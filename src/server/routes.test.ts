// The HTTP API must not change when server code moves. Run: npx tsx src/server/routes.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED = [
  "app.get('*'",
  "app.get('/api/bang-tuan'",
  "app.get('/api/cai-dat'",
  "app.get('/api/da-hoi'",
  "app.get('/api/room'",
  "app.get('/api/tiktok/events'",
  "app.get('/api/tiktok/status'",
  "app.get('/api/tts'",
  "app.post('/api/bang-tuan'",
  "app.post('/api/cai-dat'",
  "app.post('/api/control'",
  "app.post('/api/da-hoi'",
  "app.post('/api/game/state'",
  "app.post('/api/room'",
  "app.post('/api/test/emit'",
  "app.post('/api/tiktok/connect'",
  "app.post('/api/tiktok/disconnect'",
];

const root = path.resolve(import.meta.dirname, '..', '..');
const files = ['server.ts', ...fs.readdirSync(path.join(root, 'src/server'), { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => path.join('src/server', f))];
const found = files.flatMap((f) => fs.readFileSync(path.join(root, f), 'utf8').match(/app\.(?:get|post|put|delete)\('[^']+'/g) ?? []).sort();
assert.deepEqual(found, EXPECTED);
assert.ok(fs.readFileSync(path.join(root, 'server.ts'), 'utf8').split('\n').length <= 100, 'server.ts must stay a boot file');
console.log('routes: OK');
