import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const files = ['index.html', 'styles.css', 'js/app.js', 'js/core.js', 'build-info.json', 'health.json', 'vercel.json'];
for (const file of files) {
  const details = await stat(resolve(dist, file));
  assert.ok(details.size > 0, `Missing or empty: ${file}`);
}
const page = await readFile(resolve(dist, 'index.html'), 'utf8');
assert.match(page, /FocusBoard/);
console.log(`Verified ${files.length} nonempty distribution files.`);
