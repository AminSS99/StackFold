// Runs before `next build` (see vercel.json and the build:demo script).
// Always stages the compressed walkthrough video and poster for web builds
// (skipped for Tauri desktop export). When NEXT_PUBLIC_STACKFOLD_DEMO=true it
// also pre-scans the bundled fixtures for the static hosted demo.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if (process.env.NEXT_EXPORT === 'true' && process.env.NEXT_PUBLIC_STACKFOLD_DEMO !== 'true') {
  console.log('prebuild-demo: desktop export build, skipping hosted media.');
  process.exit(0);
}

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, '../..');

if (process.env.NEXT_PUBLIC_STACKFOLD_DEMO === 'true') {
  const data = spawnSync(process.execPath, [path.join(webRoot, 'scripts/run-demo-data.mjs')], {
    stdio: 'inherit',
    cwd: webRoot,
  });
  if (data.status !== 0) process.exit(data.status ?? 1);
}

const mediaOut = path.join(webRoot, 'public/demo-data/media');
fs.mkdirSync(mediaOut, { recursive: true });
const media = [
  ['docs/media/stackfold-demo-web.mp4', 'stackfold-walkthrough.mp4'],
  ['docs/media/stackfold-poster.png', 'stackfold-poster.png'],
];
for (const [from, to] of media) {
  const src = path.join(repoRoot, from);
  if (!fs.existsSync(src)) {
    console.warn(`prebuild-demo: ${from} missing, the walkthrough video will not play.`);
    continue;
  }
  fs.copyFileSync(src, path.join(mediaOut, to));
}
console.log('prebuild-demo: walkthrough media staged.');
