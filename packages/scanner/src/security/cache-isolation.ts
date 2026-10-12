import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { readSafeFile } from '../utils/file-system';

const probeKindSchema = z.enum(['html', 'json', 'production_build']);

export const cacheIsolationConfigSchema = z.object({
  schemaVersion: z.literal(1),
  baseUrl: z.string().url(),
  environment: z.string().min(1).default('production'),
  authentication: z.object({
    kind: z.literal('header'),
    headerName: z.string().min(1),
    sessionAEnv: z.string().min(1),
    sessionBEnv: z.string().min(1),
  }),
  markers: z.object({
    sessionAMarkerEnv: z.string().min(1),
    sessionBMarkerEnv: z.string().min(1),
  }),
  probes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: probeKindSchema,
    path: z.string().startsWith('/'),
  })).min(1),
});

export type CacheIsolationConfig = z.infer<typeof cacheIsolationConfigSchema>;
export type CacheIsolationProbeKind = z.infer<typeof probeKindSchema>;

export interface CacheIsolationProbeResult {
  id: string;
  label: string;
  kind: CacheIsolationProbeKind;
  path: string;
  status: 'isolated' | 'leak';
  sessionAStatus: number;
  sessionBStatus: number;
  cacheStatusA: string;
  cacheStatusB: string;
  cacheControl?: string;
  age?: string;
  durationMs: number;
  markerFingerprint: string;
}

export interface CacheIsolationResult {
  schemaVersion: 1;
  generatedAt: string;
  environment: string;
  baseUrl: string;
  authenticationKind: 'header';
  authenticationHeader: string;
  probes: CacheIsolationProbeResult[];
  reproductionTest: string;
}

export interface CacheIsolationRunOptions {
  env?: Record<string, string | undefined>;
  headless?: boolean;
  /** Allows server runtimes such as Next.js to provide a statically-resolved Playwright module. */
  playwright?: PlaywrightModuleLike;
}

interface PlaywrightResponseLike {
  status(): number;
  text(): Promise<string>;
  headers(): Record<string, string>;
}

interface PlaywrightPageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<PlaywrightResponseLike | null>;
  close(): Promise<void>;
}

interface PlaywrightContextLike {
  newPage(): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
}

interface PlaywrightBrowserLike {
  newContext(options?: Record<string, unknown>): Promise<PlaywrightContextLike>;
  close(): Promise<void>;
}

export interface PlaywrightModuleLike {
  chromium: { launch(options?: Record<string, unknown>): Promise<PlaywrightBrowserLike> };
}

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function cacheStatus(headers: Record<string, string>): string {
  return headers['x-cache'] || headers['cf-cache-status'] || headers['x-vercel-cache'] || 'UNREPORTED';
}

function requiredRuntimeValue(
  env: Record<string, string | undefined>,
  name: string
): string {
  const value = env[name];
  if (!value) throw new Error(`Cache Isolation requires runtime environment variable '${name}'.`);
  return value;
}

export function parseCacheIsolationConfig(content: string): CacheIsolationConfig {
  return cacheIsolationConfigSchema.parse(JSON.parse(content));
}

export function loadCacheIsolationConfig(rootPath: string): {
  config: CacheIsolationConfig;
  configPath: string;
} {
  const candidates = ['.stackfold/cache-isolation.json', 'stackfold.cache-isolation.json'];
  for (const configPath of candidates) {
    const content = readSafeFile(path.join(rootPath, configPath));
    if (content) return { config: parseCacheIsolationConfig(content), configPath };
  }
  throw new Error(`No Cache Isolation configuration found in '${rootPath}'.`);
}

export function generateCacheIsolationReproduction(config: CacheIsolationConfig): string {
  const probeLines = config.probes.map(probe => `
  // ${probe.label} (${probe.kind})
  const warm${safeIdentifier(probe.id)} = await sessionA.request.get(baseUrl + ${JSON.stringify(probe.path)});
  expect(warm${safeIdentifier(probe.id)}.ok()).toBeTruthy();
  const check${safeIdentifier(probe.id)} = await sessionB.request.get(baseUrl + ${JSON.stringify(probe.path)});
  expect(check${safeIdentifier(probe.id)}.ok()).toBeTruthy();
  await expect(check${safeIdentifier(probe.id)}.text()).resolves.not.toContain(process.env.${config.markers.sessionAMarkerEnv}!);`).join('\n');

  return `import { test, expect } from '@playwright/test';

test('cache isolation: private data is not shared across sessions', async ({ browser }) => {
  const baseUrl = process.env.STACKFOLD_CACHE_BASE_URL || ${JSON.stringify(config.baseUrl)};
  const sessionA = await browser.newContext({
    extraHTTPHeaders: { ${JSON.stringify(config.authentication.headerName)}: process.env.${config.authentication.sessionAEnv}! },
  });
  const sessionB = await browser.newContext({
    extraHTTPHeaders: { ${JSON.stringify(config.authentication.headerName)}: process.env.${config.authentication.sessionBEnv}! },
  });
${probeLines}

  await sessionA.close();
  await sessionB.close();
});
`;
}

function safeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$]/g, '_');
}

async function readProbe(
  context: PlaywrightContextLike,
  url: string
): Promise<{ body: string; status: number; headers: Record<string, string> }> {
  const page = await context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response) throw new Error(`Navigation to '${url}' did not return a response.`);
    return {
      body: await response.text(),
      status: response.status(),
      headers: response.headers(),
    };
  } finally {
    await page.close();
  }
}

async function loadPlaywright(): Promise<PlaywrightModuleLike> {
  // Keep Playwright optional for ordinary static scans and CLI bundles.
  return await import('playwright') as unknown as PlaywrightModuleLike;
}

export async function runCacheIsolationProbe(
  config: CacheIsolationConfig,
  options: CacheIsolationRunOptions = {}
): Promise<CacheIsolationResult> {
  const env = options.env || process.env;
  const sessionAValue = requiredRuntimeValue(env, config.authentication.sessionAEnv);
  const sessionBValue = requiredRuntimeValue(env, config.authentication.sessionBEnv);
  const sessionAMarker = requiredRuntimeValue(env, config.markers.sessionAMarkerEnv);
  const sessionBMarker = requiredRuntimeValue(env, config.markers.sessionBMarkerEnv);
  if (sessionAValue === sessionBValue) throw new Error('Cache Isolation sessions must use distinct credentials.');
  if (sessionAMarker === sessionBMarker) throw new Error('Cache Isolation sessions must use distinct private markers.');

  const playwright = options.playwright || await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: options.headless ?? true });
  const sessionA = await browser.newContext({
    extraHTTPHeaders: { [config.authentication.headerName]: sessionAValue },
  });
  const sessionB = await browser.newContext({
    extraHTTPHeaders: { [config.authentication.headerName]: sessionBValue },
  });

  const probes: CacheIsolationProbeResult[] = [];
  try {
    for (const probe of config.probes) {
      const startedAt = Date.now();
      const url = new URL(probe.path, config.baseUrl).toString();
      const warm = await readProbe(sessionA, url);
      const check = await readProbe(sessionB, url);
      probes.push({
        id: probe.id,
        label: probe.label,
        kind: probe.kind,
        path: probe.path,
        status: check.body.includes(sessionAMarker) ? 'leak' : 'isolated',
        sessionAStatus: warm.status,
        sessionBStatus: check.status,
        cacheStatusA: cacheStatus(warm.headers),
        cacheStatusB: cacheStatus(check.headers),
        cacheControl: check.headers['cache-control'],
        age: check.headers.age,
        durationMs: Date.now() - startedAt,
        markerFingerprint: fingerprint(sessionAMarker),
      });
    }
  } finally {
    await sessionA.close();
    await sessionB.close();
    await browser.close();
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: config.environment,
    baseUrl: config.baseUrl,
    authenticationKind: 'header',
    authenticationHeader: config.authentication.headerName,
    probes,
    reproductionTest: generateCacheIsolationReproduction(config),
  };
}

export const cacheIsolationResultSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  environment: z.string().min(1),
  baseUrl: z.string().url(),
  authenticationKind: z.literal('header'),
  authenticationHeader: z.string().min(1),
  probes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: probeKindSchema,
    path: z.string().startsWith('/'),
    status: z.enum(['isolated', 'leak']),
    sessionAStatus: z.number().int(),
    sessionBStatus: z.number().int(),
    cacheStatusA: z.string(),
    cacheStatusB: z.string(),
    cacheControl: z.string().optional(),
    age: z.string().optional(),
    durationMs: z.number().nonnegative(),
    markerFingerprint: z.string().length(12),
  })),
  reproductionTest: z.string().min(1),
});

export function parseCacheIsolationResult(content: string): CacheIsolationResult {
  return cacheIsolationResultSchema.parse(JSON.parse(content));
}
