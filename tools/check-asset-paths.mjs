// Every /assets/... path used in src must exist under public/. Run: node tools/check-asset-paths.mjs
// Template paths are checked by expanding the small maps in the code (see EXPANDED below).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OPTIONAL = [/^\/assets\/sfx\//]; // optional mp3 overrides; the folder does not have to exist

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

// Paths built from a code value: [prefix, values, suffix]
const EXPANDED = [
  ['/assets/characters/host/', ['cheer', 'think', 'point', 'smile', 'regret'], '.webp'],
  ['/assets/characters/winners/', ['1', '2', '3'].flatMap((r) => ['male', 'female'].map((g) => `rank${r}-${g}`)), '.webp'],
  ['/assets/characters/villagers/', ['back-male', 'back-female', 'child-boy', 'child-girl'], '.webp'],
];

const wanted = new Set();
for (const file of walk(path.join(ROOT, 'src')).filter((f) => /\.(ts|tsx|css)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\/assets\/[A-Za-z0-9_\-./]+\.(?:webp|jpg|jpeg|png|svg|mp3)/g)) wanted.add(m[0]);
}
for (const [prefix, names, suffix] of EXPANDED) for (const n of names) wanted.add(`${prefix}${n}${suffix}`);

const missing = [...wanted].filter((p) => !OPTIONAL.some((r) => r.test(p)) && !fs.existsSync(path.join(ROOT, 'public', p)));
if (missing.length) {
  console.error('Missing assets:\n' + missing.map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log(`asset paths: OK (${wanted.size} checked)`);
