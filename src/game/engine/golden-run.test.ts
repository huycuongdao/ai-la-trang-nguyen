// Golden run: a seeded, scripted game must always give the same transitions, events and ranking.
// Run: npx tsx src/game/engine/golden-run.test.ts   (add --update to rewrite the fixture)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runScenario } from './golden-scenario';

const fixtureUrl = new URL('./fixtures/golden-run.json', import.meta.url);
const fresh = JSON.parse(JSON.stringify(runScenario()));
const again = JSON.parse(JSON.stringify(runScenario()));
assert.deepEqual(again, fresh, 'golden run is not deterministic');

if (process.argv.includes('--update')) {
  fs.writeFileSync(fixtureUrl, JSON.stringify(fresh, null, 2) + '\n');
  console.log('golden-run: fixture written');
} else {
  assert.deepEqual(fresh, JSON.parse(fs.readFileSync(fixtureUrl, 'utf8')));
  console.log('golden-run: OK');
}
