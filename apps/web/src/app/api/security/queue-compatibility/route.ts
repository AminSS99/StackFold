import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  loadQueueCompatibilityConfig,
  parseQueueCompatibilityResult,
  runQueueCompatibilityCheck,
} from '@stackfold/scanner';
import {
  checkRateLimit,
  resolveSafeTarget,
  sanitizeConfigPath,
} from '@/lib/server-security';

export const dynamic = 'force-static';

const requestSchema = z.object({
  rootPath: z.string().min(1).max(1024).optional(),
  fixture: z.string().min(1).max(120).optional(),
});

const QUEUE_FIXTURES = new Set([
  'queue-compatibility-failing',
  'queue-compatibility-passing',
]);

function resultCandidates(root: string): string[] {
  return [
    path.join(root, '.stackfold/queue-compatibility-results.json'),
    path.join(root, 'stackfold.queue-compatibility-results.json'),
  ];
}

export async function GET(request: Request) {
  const rateLimitResponse = checkRateLimit(request, 'api-sec-queue-get', 40, 60_000);
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
        defaultFixture: 'queue-compatibility-failing',
        allowedFixtures: QUEUE_FIXTURES,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let configPath = '';
    try {
      ({ configPath } = loadQueueCompatibilityConfig(target.physicalRoot));
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `No Queue Compatibility configuration found for '${target.source}'. Add .stackfold/queue-compatibility.json.`,
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
        const result = parseQueueCompatibilityResult(content);
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
        error: `No recorded Queue Compatibility result found for '${target.source}'. Run a live check first.`,
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
  const rateLimitResponse = checkRateLimit(request, 'api-sec-queue-post', 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

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
        { success: false, error: 'Invalid check request.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    let target: ReturnType<typeof resolveSafeTarget>;
    try {
      target = resolveSafeTarget({
        req: request,
        rootPath: parsed.data.rootPath,
        fixture: parsed.data.fixture,
        defaultFixture: 'queue-compatibility-failing',
        allowedFixtures: QUEUE_FIXTURES,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let config: ReturnType<typeof loadQueueCompatibilityConfig>['config'];
    let configPath = '';
    try {
      ({ config, configPath } = loadQueueCompatibilityConfig(target.physicalRoot));
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `No Queue Compatibility configuration found for '${target.source}'. Add .stackfold/queue-compatibility.json.`,
          code: 'MISSING_CONFIGURATION',
          source: target.source,
        },
        { status: 404 }
      );
    }

    const safeConfigPath = sanitizeConfigPath(configPath, target.physicalRoot);
    try {
      const result = await runQueueCompatibilityCheck(config, { rootPath: target.physicalRoot });
      return NextResponse.json({
        success: true,
        result,
        source: `live:${target.source}`,
        configPath: safeConfigPath,
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Queue Compatibility check failed.',
          code: 'CHECK_FAILED',
          source: target.source,
          configPath: safeConfigPath,
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Queue Compatibility check failed.', code: 'CHECK_FAILED' },
      { status: 500 }
    );
  }
}
