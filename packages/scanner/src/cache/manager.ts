import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { validateScanArtifact, type StackfoldScanArtifact } from './types';
import type { ProjectGraph, ScanDiagnostic } from '@stackfold/graph';

export function getDefaultCacheDir(): string {
  const home = os.homedir();
  return path.join(home, '.stackfold', 'cache');
}

export function getArtifactKey(rootPath: string): string {
  return crypto.createHash('sha256').update(path.resolve(rootPath)).digest('hex').slice(0, 16);
}

export function computeProjectFingerprint(rootPath: string, keyFiles: string[] = []): string {
  const hash = crypto.createHash('sha256');

  // Key manifest and schema files to monitor for changes
  const candidateFiles = [
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'prisma/schema.prisma',
    'schema.prisma',
    '.env.example',
    ...keyFiles,
  ];

  const uniqueFiles = Array.from(new Set(candidateFiles));
  for (const rel of uniqueFiles) {
    const full = path.join(rootPath, rel);
    try {
      if (fs.existsSync(full)) {
        const stats = fs.statSync(full);
        hash.update(`${rel}:${stats.mtimeMs}:${stats.size};`);
      }
    } catch {
      // Ignore file access errors
    }
  }

  return hash.digest('hex').slice(0, 32);
}

export class ScanCacheManager {
  private cacheDir: string;

  constructor(customCacheDir?: string) {
    this.cacheDir = customCacheDir || getDefaultCacheDir();
    this.ensureCacheDir();
  }

  private ensureCacheDir() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch {
      // Graceful fallback
    }
  }

  public getCacheFilePath(rootPath: string): string {
    const key = getArtifactKey(rootPath);
    return path.join(this.cacheDir, `scan-${key}.json`);
  }

  public async saveArtifact(params: {
    rootPath: string;
    projectName: string;
    durationMs: number;
    scannedFilesCount: number;
    graph: ProjectGraph;
    diagnostics: ScanDiagnostic[];
    fileFingerprint?: string;
  }): Promise<string | null> {
    try {
      this.ensureCacheDir();
      const fingerprint =
        params.fileFingerprint || computeProjectFingerprint(params.rootPath);

      const artifact: StackfoldScanArtifact = {
        schemaVersion: '1.0.0',
        scannerVersion: '0.1.0',
        rootPath: path.resolve(params.rootPath),
        projectName: params.projectName,
        scannedAt: new Date().toISOString(),
        durationMs: params.durationMs,
        scannedFilesCount: params.scannedFilesCount,
        fileFingerprint: fingerprint,
        graph: params.graph,
        diagnostics: params.diagnostics,
      };

      const validated = validateScanArtifact(artifact);
      const filePath = this.getCacheFilePath(params.rootPath);
      fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf8');
      return filePath;
    } catch (err) {
      console.warn('Failed to save scan cache artifact:', err);
      return null;
    }
  }

  public async loadArtifact(
    rootPath: string,
    checkFingerprint = true
  ): Promise<StackfoldScanArtifact | null> {
    try {
      const filePath = this.getCacheFilePath(rootPath);
      if (!fs.existsSync(filePath)) return null;

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const artifact = validateScanArtifact(parsed);

      if (path.resolve(artifact.rootPath) !== path.resolve(rootPath)) {
        return null;
      }

      if (checkFingerprint) {
        const currentFingerprint = computeProjectFingerprint(rootPath);
        if (artifact.fileFingerprint !== currentFingerprint) {
          // Stale cache
          return null;
        }
      }

      return artifact;
    } catch {
      return null;
    }
  }

  public async invalidateArtifact(rootPath: string): Promise<boolean> {
    try {
      const filePath = this.getCacheFilePath(rootPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async listArtifacts(): Promise<
    Array<{ rootPath: string; projectName: string; scannedAt: string; nodeCount: number }>
  > {
    try {
      this.ensureCacheDir();
      const files = fs.readdirSync(this.cacheDir).filter(f => f.startsWith('scan-') && f.endsWith('.json'));
      const results: Array<{ rootPath: string; projectName: string; scannedAt: string; nodeCount: number }> = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.cacheDir, file), 'utf8');
          const parsed = JSON.parse(content);
          if (parsed.schemaVersion === '1.0.0' && parsed.rootPath) {
            results.push({
              rootPath: parsed.rootPath,
              projectName: parsed.projectName || path.basename(parsed.rootPath),
              scannedAt: parsed.scannedAt,
              nodeCount: parsed.graph?.nodes?.length || 0,
            });
          }
        } catch {
          // Skip invalid cache entry
        }
      }

      return results.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    } catch {
      return [];
    }
  }
}
