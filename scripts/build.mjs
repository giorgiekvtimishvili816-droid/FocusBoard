import { cp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'public');
const target = join(root, 'dist');

await stat(join(source, 'index.html'));
await rm(target, { force: true, recursive: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await writeFile(join(target, 'build-info.json'), JSON.stringify({
  app: 'FocusBoard',
  version: '1.0.0',
  commit: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
  builtAt: new Date().toISOString()
}, null, 2) + '\n');
console.log('Build complete: public/ → dist/');
