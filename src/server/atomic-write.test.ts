// Run: npx tsx src/server/atomic-write.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeJsonAtomic } from './store';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-'));
const file = path.join(dir, 'nested', 'x.json');

// formats: compact by default, 2-space when pretty; parent directory is created
writeJsonAtomic(file, { a: 1 });
assert.equal(fs.readFileSync(file, 'utf8'), '{"a":1}');
writeJsonAtomic(file, { a: 1 }, true);
assert.equal(fs.readFileSync(file, 'utf8'), '{\n  "a": 1\n}');

// a reader never sees a partial file while the writer loops
for (let i = 0; i < 1000; i++) {
  writeJsonAtomic(file, { i, pad: 'x'.repeat(i % 500) });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).i, i);
}
assert.deepEqual(fs.readdirSync(path.dirname(file)), ['x.json']); // no temp file left
fs.rmSync(dir, { recursive: true });
console.log('atomic-write: OK');
