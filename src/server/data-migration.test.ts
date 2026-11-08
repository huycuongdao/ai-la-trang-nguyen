// Run: npx tsx src/server/data-migration.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateData } from './data-migration';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-'));
const data = path.join(root, 'data');
fs.mkdirSync(data);
const used = JSON.stringify({ 'q1|a': 1, 'q2|b': 2, 'q3|c': 3 });
fs.writeFileSync(path.join(data, 'da-hoi.json'), used);
fs.writeFileSync(path.join(data, 'bang-tuan.json'), '{"tuan":"2026-11-02","ds":{}}');
const logs: string[] = [];
const log = (m: string) => logs.push(m);

migrateData(data, root, log);
assert.deepEqual(fs.readdirSync(data).sort(), ['used-questions.json', 'weekly-board.json']);
assert.equal(fs.readFileSync(path.join(data, 'used-questions.json'), 'utf8'), used); // keys and counts preserved
const backups = fs.readdirSync(root).filter((f) => f.startsWith('data-backup-'));
assert.equal(backups.length, 1);
assert.equal(fs.readFileSync(path.join(root, backups[0], 'da-hoi.json'), 'utf8'), used);

// second boot: no-op, no second backup
logs.length = 0;
migrateData(data, root, log);
assert.equal(fs.readdirSync(root).filter((f) => f.startsWith('data-backup-')).length, 1);
assert.deepEqual(logs, []);

// both old and new exist: new wins, old is left alone and logged
fs.writeFileSync(path.join(data, 'da-hoi.json'), '{"old":1}');
migrateData(data, root, log);
assert.equal(fs.readFileSync(path.join(data, 'used-questions.json'), 'utf8'), used);
assert.equal(fs.readFileSync(path.join(data, 'da-hoi.json'), 'utf8'), '{"old":1}');
assert.equal(logs.length, 1);

// fresh install: nothing to do
const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-'));
migrateData(path.join(empty, 'data'), empty, log);
fs.rmSync(root, { recursive: true });
fs.rmSync(empty, { recursive: true });
console.log('data-migration: OK');
