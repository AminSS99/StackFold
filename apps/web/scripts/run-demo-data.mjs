// Bundles build-demo-data.mjs (which imports the workspace scanner's TypeScript source)
// with the scanner package's own esbuild, then runs it. No new dependencies required.
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const webRoot = process.cwd();
const scannerDir = path.resolve(webRoot, '../../packages/scanner');
const esbuild = createRequire(path.join(scannerDir, 'package.json'))('esbuild');
const outfile = path.join(scannerDir, '.demo-tmp/build-demo-data.mjs');

await esbuild.build({
  entryPoints: [path.join(webRoot, 'scripts/build-demo-data.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['playwright', 'typescript', 'fast-glob', 'zod'],
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
  outfile,
  logLevel: 'warning',
});

const run = spawnSync(process.execPath, [outfile], { stdio: 'inherit', cwd: webRoot });
process.exit(run.status ?? 1);
