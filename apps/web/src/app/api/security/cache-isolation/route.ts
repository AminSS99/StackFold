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

// Static-export compatible: all other API routes use force-static so the
// Tauri `NEXT_EXPORT=true` build can collect pages without a Node server.
// Desktop never calls this route — it uses Tauri commands via the platform
// adapter. Web deployments call it explicitly through WebPlatformAdapter.
export const dynamic = 'force-static';

const requestSchema = z.object({
  rootPath: z.string().min(1).optional(),
  fixture: z.string().min(1).max(120).optional(),
});

const FIXTURE_IDS = new Set([
  'cache-isolation-vulnerable',
  'sample-ecommerce-app',
  'sample-monorepo-platform',
  'preview-fence-vercel-supabase',
  'tx-escape-prisma',
  'scopepatch-idtrace',
  'stackfold-self',
]);

function resolveTargetRoot(rootPath?: string, fixture?: string): { root: string; source: string } {
  if (fixture) {
    if (!FIXTURE_IDS.has(fixture)) {
      throw new Error(`Unknown bundled fixture: '${fixture}'.`);
    }
    if (fixture === 'stackfold-self') {
      return { root: path.resolve(process.cwd(), '../../'), source: 'fixture:stackfold-self' };
    }
    return { root: path.resolve(process.cwd(), `../../fixtures/${fixture}`), source: `fixture:${fixture}` };
  }
  if (rootPath) {
    const canonical = path.resolve(rootPath);
    const workspaceRoot = path.resolve(process.cwd(), '../../');
    // Local-first bound: only allow paths inside the workspace parent or the
    // fixture tree to avoid arbitrary filesystem reads from the web server.
    // Absolute system paths are rejected; the desktop path uses Tauri commands.
    if (!canonical.startsWith(workspaceRoot) && !canonical.startsWith('/tmp/')) {
      throw new Error('rootPath is outside the allowed local workspace.');
    }
    return { root: canonical, source: 'selected-project' };
  }
  return { root: path.resolve(process.cwd(), '../../fixtures/cache-isolation-vulnerable'), source: 'fixture:cache-isolation-vulnerable' };
}

function resultCandidates(root: string): string[] {
  return [
    path.join(root, '.stackfold/cache-isolation-results.json'),
    path.join(root, 'stackfold.cache-isolation-results.json'),
  ];
}

async function fixtureIsRunning(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: { 'x-stackfold-test-session': 'fixture-health-check' },
      cache: 'no-store',
    });
    // Any HTTP response (including 200 with anonymous identity) proves liveness.
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
    let target: { root: string; source: string };
    try {
      target = resolveTargetRoot(parsed.data.rootPath, parsed.data.fixture);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }
    let configPath = '';
    try {
      ({ configPath } = loadCacheIsolationConfig(target.root));
    } catch {
      return NextResponse.json(
        { success: false, error: `No Cache Isolation configuration found for '${target.source}'. Add .stackfold/cache-isolation.json.`, code: 'MISSING_CONFIGURATION', source: target.source },
        { status: 404 }
      );
    }
    for (const candidate of resultCandidates(target.root)) {
      try {
        const content = fs.readFileSync(candidate, 'utf8');
        const result = parseCacheIsolationResult(content);
        return NextResponse.json({ success: true, result, source: `recorded:${target.source}`, configPath });
      } catch {
        continue;
      }
    }
    return NextResponse.json(
      { success: false, error: `No recorded Cache Isolation result found for '${target.source}'. Run a live probe first.`, code: 'MISSING_RECORDED_RESULT', source: target.source, configPath },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to read recorded result.', code: 'RECORDED_LOAD_FAILED' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    let target: { root: string; source: string };
    try {
      target = resolveTargetRoot(parsed.data.rootPath, parsed.data.fixture);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let config: ReturnType<typeof loadCacheIsolationConfig>['config'];
    let configPath = '';
    try {
      ({ config, configPath } = loadCacheIsolationConfig(target.root));
    } catch {
      return NextResponse.json(
        { success: false, error: `No Cache Isolation configuration found for '${target.source}'. Add .stackfold/cache-isolation.json.`, code: 'MISSING_CONFIGURATION', source: target.source },
        { status: 404 }
      );
    }

    // Resolve credential and marker values from environment references only.
    // Values are never rendered, serialized, logged, or persisted.
    const missingEnv: string[] = [];
    for (const name of [config.authentication.sessionAEnv, config.authentication.sessionBEnv, config.markers.sessionAMarkerEnv, config.markers.sessionBMarkerEnv]) {
      if (!process.env[name]) missingEnv.push(name);
    }
    const isBundledDemo = target.source === 'fixture:cache-isolation-vulnerable' && !parsed.data.rootPath;
    const env: Record<string, string | undefined> = { ...process.env };
    if (isBundledDemo) {
      env.STACKFOLD_SESSION_A ||= 'fixture-auth-alpha';
      env.STACKFOLD_SESSION_B ||= 'fixture-auth-beta';
      env.STACKFOLD_MARKER_A ||= 'private-marker-a';
      env.STACKFOLD_MARKER_B ||= 'private-marker-b';
    }
    if (missingEnv.length > 0 && !isBundledDemo) {
      return NextResponse.json(
        { success: false, error: `Missing environment references: ${missingEnv.join(', ')}.`, code: 'MISSING_ENVIRONMENT', source: target.source, configPath, missingEnv },
        { status: 412 }
      );
    }

    // Only the bundled demo auto-starts its fixture server. Selected projects
    // must already be running; otherwise report target-unavailable.
    const alreadyRunning = await fixtureIsRunning(config.baseUrl);
    if (!alreadyRunning) {
      if (isBundledDemo) {
        fixtureProcess = spawn(process.execPath, ['server.mjs'], {
          cwd: target.root,
          stdio: 'ignore',
        });
        try {
          await waitForFixture(config.baseUrl);
        } catch (error) {
          return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Target application unavailable.', code: 'TARGET_UNAVAILABLE', source: target.source, configPath },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Target application at '${config.baseUrl}' is unavailable. Start the selected project first.`, code: 'TARGET_UNAVAILABLE', source: target.source, configPath },
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
        { success: false, error: 'Playwright browser automation is unavailable in this environment.', code: 'PLAYWRIGHT_UNAVAILABLE', source: target.source, configPath },
        { status: 501 }
      );
    }

    try {
      const result = await runCacheIsolationProbe(config, { headless: true, playwright, env });
      return NextResponse.json({ success: true, result, source: `live:${target.source}`, configPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cache Isolation probe failed.';
      const code = message.includes('did not become reachable') || message.includes('Navigation') ? 'TARGET_UNAVAILABLE' : 'PROBE_FAILED';
      return NextResponse.json(
        { success: false, error: message, code, source: target.source, configPath },
        { status: code === 'TARGET_UNAVAILABLE' ? 502 : 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cache Isolation probe failed.', code: 'PROBE_FAILED' },
      { status: 500 }
    );
  } finally {
    fixtureProcess?.kill('SIGTERM');
  }
}
