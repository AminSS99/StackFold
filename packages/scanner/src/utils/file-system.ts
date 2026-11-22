import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { loadIgnorePatterns } from '../pipeline/ignore';

const ALLOWED_ENV_TEMPLATES = new Set(['.env.example', '.env.sample', '.env.template']);

export function isSecretOrKeyFileName(filePath: string): boolean {
  const base = path.basename(filePath);
  if (ALLOWED_ENV_TEMPLATES.has(base)) return false;
  if (base === '.env' || base === '.envrc' || base.startsWith('.env.')) return true;
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(base)) return true;
  if (/^id_(?:rsa|ed25519|ecdsa|dsa)(?:\.pub)?$/i.test(base)) return true;
  if (base === '.npmrc' || base === '.pypirc' || base === '.netrc' || base === '.dockercfg') return true;
  return false;
}

export async function discoverFiles(rootPath: string, customIgnore?: string[]): Promise<string[]> {
  const ignore = [...loadIgnorePatterns(rootPath), ...(customIgnore || [])];

  const entries = await fg(['**/*'], {
    cwd: rootPath,
    dot: true,
    ignore,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  return entries
    .map(e => e.replace(/\\/g, '/'))
    .filter(e => !isSecretOrKeyFileName(e));
}

export function readSafeFile(absolutePath: string, allowedRoot?: string): string | null {
  try {
    if (!absolutePath || absolutePath.includes('\0')) return null;
    if (!fs.existsSync(absolutePath)) return null;

    // Never follow symbolic links when reading repository files.
    const lstat = fs.lstatSync(absolutePath);
    if (lstat.isSymbolicLink() || !lstat.isFile()) return null;
    if (lstat.size > 2 * 1024 * 1024) return null;

    if (isSecretOrKeyFileName(absolutePath)) return null;

    if (allowedRoot) {
      const realRoot = fs.realpathSync(allowedRoot);
      const realTarget = fs.realpathSync(absolutePath);
      const rel = path.relative(realRoot, realTarget);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return null;
      }
    }

    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

export function getRelativePath(rootPath: string, absolutePath: string): string {
  return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
}
