import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { loadIgnorePatterns } from '../pipeline/ignore';

export async function discoverFiles(rootPath: string, customIgnore?: string[]): Promise<string[]> {
  const ignore = [...loadIgnorePatterns(rootPath), ...(customIgnore || [])];

  const entries = await fg(['**/*'], {
    cwd: rootPath,
    dot: true,
    ignore,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  return entries.map(e => e.replace(/\\/g, '/'));
}

export function readSafeFile(absolutePath: string): string | null {
  try {
    if (!fs.existsSync(absolutePath)) return null;
    const stats = fs.statSync(absolutePath);
    if (stats.size > 2 * 1024 * 1024) return null;
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

export function getRelativePath(rootPath: string, absolutePath: string): string {
  return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
}
