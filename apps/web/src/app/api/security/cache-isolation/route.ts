import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  loadCacheIsolationConfig,
  parseCacheIsolationResult,
  runCacheIsolationProbe,
  type PlaywrightModuleLike,
} from '@stackfold/scanner';
import {
  checkRateLimit,
  isLoopbackUrl,
  resolveSafeTarget,
  sanitizeConfigPath,
} from '@/lib/server-security';

export const dynamic = 'force-static';

const requestSchema = z.object({
  rootPath: z.string().min(1).max(1024).optional(),
  fixture: z.string().min(1).max(120).optional(),
});

const CACHE_FIXTURES = new Set(['cache-isolation-vulnerable']);

function resultCandidates(root: string): string[] {
  return [
    path.join(root, '.stackfold/cache-isolation-results.json'),
    path.join(root, 'stackfold.cache-isolation-results.json'),
  ];
}

async function fixtureIsRunning(baseUrl: string): Promise<boolean> {
  if (!isLoopbackUrl(baseUrl)) return false;
  try {
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: { 'x-stackfold-test-session': 'fixture-health-check' },
      cache: 'no-store',
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForFixture(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await fixtureIsRunning(baseUrl)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The target application did not become reachable in time.');
}

export async function GET(request: Request) {
  const rateLimitResponse = checkRateLimit(request, 'api-sec-cache-get', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const url = new URL(request.url);
    const parsed = requestSchema.safeParse({
      rootPath: url.searchParams.get('rootPath') || undefined,
      fixture: url.searchParams.get('fixture') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid recorded-result request.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    let target: ReturnType<typeof resolveSafeTarget>;
    try {
      target = resolveSafeTarget({
        req: request,
        rootPath: parsed.data.rootPath,
        fixture: parsed.data.fixture,
        defaultFixture: 'cache-isolation-vulnerable',
        allowedFixtures: CACHE_FIXTURES,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let configPath = '';
    try {
      ({ configPath } = loadCacheIsolationConfig(target.physicalRoot));
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `No Cache Isolation configuration found for '${target.source}'. Add .stackfold/cache-isolation.json.`,
          code: 'MISSING_CONFIGURATION',
          source: target.source,
        },
        { status: 404 }
      );
    }

    const safeConfigPath = sanitizeConfigPath(configPath, target.physicalRoot);
    for (const candidate of resultCandidates(target.physicalRoot)) {
      try {
        const content = fs.readFileSync(candidate, 'utf8');
        const result = parseCacheIsolationResult(content);
        return NextResponse.json({
          success: true,
          result,
          source: `recorded:${target.source}`,
          configPath: safeConfigPath,
        });
      } catch {
        continue;
      }
    }
    return NextResponse.json(
      {
        success: false,
        error: `No recorded Cache Isolation result found for '${target.source}'. Run a live probe first.`,
        code: 'MISSING_RECORDED_RESULT',
        source: target.source,
        configPath: safeConfigPath,
      },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unable to read recorded result.', code: 'RECORDED_LOAD_FAILED' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = checkRateLimit(request, 'api-sec-cache-post', 15, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  let fixtureProcess: ChildProcess | undefined;
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid probe request.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    let target: ReturnType<typeof resolveSafeTarget>;
    try {
      target = resolveSafeTarget({
        req: request,
        rootPath: parsed.data.rootPath,
        fixture: parsed.data.fixture,
        defaultFixture: 'cache-isolation-vulnerable',
        allowedFixtures: CACHE_FIXTURES,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let config: ReturnType<typeof loadCacheIsolationConfig>['config'];
    let configPath = '';
    try {
      ({ config, configPath } = loadCacheIsolationConfig(target.physicalRoot));
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `No Cache Isolation configuration found for '${target.source}'. Add .stackfold/cache-isolation.json.`,
          code: 'MISSING_CONFIGURATION',
          source: target.source,
        },
        { status: 404 }
      );
    }

    const safeConfigPath = sanitizeConfigPath(configPath, target.physicalRoot);

    // SSRF Guard: Only allow loopback targets in live browser probes
    if (!isLoopbackUrl(config.baseUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cache Isolation probes only permit local loopback target URLs (localhost / 127.0.0.1).',
          code: 'INVALID_TARGET_URL',
          source: target.source,
          configPath: safeConfigPath,
        },
        { status: 400 }
      );
    }

    const missingEnv: string[] = [];
    for (const name of [
      config.authentication.sessionAEnv,
      config.authentication.sessionBEnv,
      config.markers.sessionAMarkerEnv,
      config.markers.sessionBMarkerEnv,
    ]) {
      if (!process.env[name]) missingEnv.push(name);
    }
    const isBundledDemo = target.source === 'fixture:cache-isolation-vulnerable';
    const env: Record<string, string | undefined> = { ...process.env };
    if (isBundledDemo) {
      env.STACKFOLD_SESSION_A ||= 'fixture-auth-alpha';
      env.STACKFOLD_SESSION_B ||= 'fixture-auth-beta';
      env.STACKFOLD_MARKER_A ||= 'private-marker-a';
      env.STACKFOLD_MARKER_B ||= 'private-marker-b';
    }
    if (missingEnv.length > 0 && !isBundledDemo) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing environment references: ${missingEnv.join(', ')}.`,
          code: 'MISSING_ENVIRONMENT',
          source: target.source,
          configPath: safeConfigPath,
          missingEnv,
        },
        { status: 412 }
      );
    }

    const alreadyRunning = await fixtureIsRunning(config.baseUrl);
    if (!alreadyRunning) {
      if (isBundledDemo) {
        fixtureProcess = spawn(process.execPath, ['server.mjs'], {
          cwd: target.physicalRoot,
          stdio: 'ignore',
        });
        try {
          await waitForFixture(config.baseUrl);
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Target application unavailable.',
              code: 'TARGET_UNAVAILABLE',
              source: target.source,
              configPath: safeConfigPath,
            },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Target application at '${config.baseUrl}' is unavailable. Start the selected project first.`,
            code: 'TARGET_UNAVAILABLE',
            source: target.source,
            configPath: safeConfigPath,
          },
          { status: 502 }
        );
      }
    }

    let playwright: PlaywrightModuleLike | undefined;
    try {
      const imported = await import('playwright');
      playwright = { chromium: (imported as unknown as { chromium: PlaywrightModuleLike['chromium'] }).chromium };
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Playwright browser automation is unavailable in this environment.',
          code: 'PLAYWRIGHT_UNAVAILABLE',
          source: target.source,
          configPath: safeConfigPath,
        },
        { status: 501 }
      );
    }

    try {
      const result = await runCacheIsolationProbe(config, { headless: true, playwright, env });
      return NextResponse.json({
        success: true,
        result,
        source: `live:${target.source}`,
        configPath: safeConfigPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cache Isolation probe failed.';
      const code =
        message.includes('did not become reachable') || message.includes('Navigation')
          ? 'TARGET_UNAVAILABLE'
          : 'PROBE_FAILED';
      return NextResponse.json(
        { success: false, error: message, code, source: target.source, configPath: safeConfigPath },
        { status: code === 'TARGET_UNAVAILABLE' ? 502 : 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Cache Isolation probe failed.', code: 'PROBE_FAILED' },
      { status: 500 }
    );
  } finally {
    fixtureProcess?.kill('SIGTERM');
  }
}
