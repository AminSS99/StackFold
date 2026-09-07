import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  validateRepositoryPath,
  ScanCacheManager,
  scanRepository,
} from '../index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECOM_FIXTURE_PATH = path.resolve(__dirname, '../../../../fixtures/sample-ecommerce-app');
const MONOREPO_FIXTURE_PATH = path.resolve(__dirname, '../../../../fixtures/sample-monorepo-platform');

describe('Path Validator & Security Boundaries', () => {
  it('rejects empty or whitespace paths', () => {
    const res = validateRepositoryPath('   ');
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('EMPTY_PATH');
  });

  it('rejects forbidden system roots', () => {
    const res = validateRepositoryPath('/');
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('FORBIDDEN_SYSTEM_ROOT');
  });

  it('rejects non-existent directories', () => {
    const res = validateRepositoryPath('/path/that/does/not/exist/at/all');
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('PATH_NOT_FOUND');
  });

  it('rejects regular files that are not directories', () => {
    const filePath = path.join(ECOM_FIXTURE_PATH, 'package.json');
    const res = validateRepositoryPath(filePath);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('NOT_A_DIRECTORY');
  });

  it('validates genuine local repositories with detected project metadata', () => {
    const res = validateRepositoryPath(ECOM_FIXTURE_PATH);
    expect(res.isValid).toBe(true);
    expect(res.hasPackageJson).toBe(true);
    expect(res.hasTsConfig).toBe(true);
    expect(res.hasPrisma).toBe(true);
    expect(res.projectName).toBe('sample-ecommerce-app');
  });

  it('detects monorepo project structures', () => {
    const res = validateRepositoryPath(MONOREPO_FIXTURE_PATH);
    expect(res.isValid).toBe(true);
    expect(res.isMonorepo).toBe(true);
    expect(res.projectName).toBe('sample-monorepo-platform');
  });
});

describe('Scan Cache Manager', () => {
  it('saves, loads, and invalidates versioned scan artifacts', async () => {
    const tempCacheDir = path.join(os.tmpdir(), `stackfold-test-cache-${Date.now()}`);
    const cache = new ScanCacheManager(tempCacheDir);

    const scanResult = await scanRepository({
      rootPath: ECOM_FIXTURE_PATH,
    });

    const savedPath = await cache.saveArtifact({
      rootPath: ECOM_FIXTURE_PATH,
      projectName: 'sample-ecommerce-app',
      durationMs: scanResult.durationMs,
      scannedFilesCount: scanResult.scannedFilesCount,
      graph: scanResult.graph,
      diagnostics: scanResult.diagnostics,
    });

    expect(savedPath).toBeDefined();
    expect(fs.existsSync(savedPath!)).toBe(true);

    const loaded = await cache.loadArtifact(ECOM_FIXTURE_PATH);
    expect(loaded).toBeDefined();
    expect(loaded?.schemaVersion).toBe('1.0.0');
    expect(loaded?.projectName).toBe('sample-ecommerce-app');
    expect(loaded?.graph.nodes.length).toBe(scanResult.graph.nodes.length);

    // Test invalidation
    const invalidated = await cache.invalidateArtifact(ECOM_FIXTURE_PATH);
    expect(invalidated).toBe(true);

    const reloaded = await cache.loadArtifact(ECOM_FIXTURE_PATH);
    expect(reloaded).toBeNull();

    // Clean up
    fs.rmSync(tempCacheDir, { recursive: true, force: true });
  });

  it('gracefully recovers from corrupt or malformed cache files', async () => {
    const tempCacheDir = path.join(os.tmpdir(), `stackfold-test-corrupt-${Date.now()}`);
    const cache = new ScanCacheManager(tempCacheDir);

    const cacheFile = cache.getCacheFilePath(ECOM_FIXTURE_PATH);
    fs.mkdirSync(tempCacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, '{ "invalidJson": true, malformed }', 'utf8');

    const loaded = await cache.loadArtifact(ECOM_FIXTURE_PATH);
    expect(loaded).toBeNull();

    fs.rmSync(tempCacheDir, { recursive: true, force: true });
  });
});

describe('Scan Lifecycle & Abort Control', () => {
  it('reports progress events across scan stages', async () => {
    const stagesSeen: string[] = [];

    const result = await scanRepository({
      rootPath: ECOM_FIXTURE_PATH,
      onProgress: p => {
        stagesSeen.push(p.stage);
      },
    });

    expect(stagesSeen).toContain('VALIDATING_PATH');
    expect(stagesSeen).toContain('DISCOVERING_FILES');
    expect(stagesSeen).toContain('ANALYZING_WORKSPACE');
    expect(stagesSeen).toContain('PARSING_PRISMA_SCHEMAS');
    expect(stagesSeen).toContain('COMPLETED');
    expect(result.graph.nodes.length).toBeGreaterThan(0);
  });

  it('aborts scan when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      scanRepository({
        rootPath: ECOM_FIXTURE_PATH,
        signal: controller.signal,
      })
    ).rejects.toThrow('Scan aborted by user');
  });

  it('scans multi-package monorepo platform fixture accurately', async () => {
    const result = await scanRepository({
      rootPath: MONOREPO_FIXTURE_PATH,
    });

    expect(result.graph.metadata.stats.nodeCount).toBeGreaterThan(5);

    // Verify discovered applications & packages
    const appNodes = result.graph.nodes.filter(n => n.type === 'application' || n.type === 'package');
    const appDisplayNames = appNodes.map(n => n.displayName);
    expect(appDisplayNames).toContain('@platform/web');
    expect(appDisplayNames).toContain('@platform/api');
    expect(appDisplayNames).toContain('@platform/db');
    expect(appDisplayNames).toContain('@platform/utils');

    // Verify routes across apps
    const routes = result.graph.nodes.filter(n => n.type === 'api_route');
    const routePaths = routes.map(r => r.displayName);
    expect(routePaths).toContain('POST /api/auth');
    expect(routePaths).toContain('POST /api/billing');
    expect(routePaths).toContain('GET /api/analytics');

    // Verify models in packages/db
    const models = result.graph.nodes.filter(n => n.type === 'database_model');
    const modelNames = models.map(m => m.displayName);
    expect(modelNames).toContain('Organization');
    expect(modelNames).toContain('User');
    expect(modelNames).toContain('Invoice');
  });
});
