import { NextResponse } from 'next/server';
import path from 'node:path';
import { z } from 'zod';
import { scanRepository, validateRepositoryPath } from '@stackfold/scanner';
import {
  checkRateLimit,
  PUBLIC_FIXTURES,
  resolveSafeTarget,
  sanitizeServerPaths,
} from '@/lib/server-security';

export const dynamic = 'force-static';

const scanRequestSchema = z.object({
  rootPath: z.string().max(1024).optional(),
  fixture: z.string().max(120).optional(),
  projectName: z.string().max(120).optional(),
  useCache: z.boolean().optional(),
  maxFiles: z.number().int().positive().max(15000).optional(),
});

export async function POST(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-scan', 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Malformed JSON payload in scan request',
          code: 'MALFORMED_JSON',
        },
        { status: 400 }
      );
    }

    const parseResult = scanRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid scan request parameters',
          code: 'INVALID_REQUEST_BODY',
        },
        { status: 400 }
      );
    }

    const { fixture, rootPath: rawRootPath, projectName, useCache, maxFiles } = parseResult.data;

    if (!fixture && !rawRootPath) {
      return NextResponse.json(
        {
          error: 'Either rootPath or fixture identifier must be provided',
          code: 'MISSING_TARGET_PATH',
        },
        { status: 400 }
      );
    }

    let resolvedTarget: ReturnType<typeof resolveSafeTarget>;
    try {
      resolvedTarget = resolveSafeTarget({
        req,
        fixture,
        rootPath: rawRootPath,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid repository target';
      const isForbidden = msg.includes('disabled on the public hosted') || msg.includes('disabled on public');
      return NextResponse.json(
        {
          error: msg,
          code: isForbidden ? 'HOSTED_DEMO_RESTRICTED' : 'INVALID_PATH',
        },
        { status: isForbidden ? 403 : 400 }
      );
    }

    // Validate path & security bounds
    const validation = validateRepositoryPath(resolvedTarget.physicalRoot);
    if (!validation.isValid || !validation.canonicalPath) {
      return NextResponse.json(
        {
          error: validation.errorMessage || 'Invalid repository path',
          code: validation.errorCode || 'INVALID_PATH',
        },
        { status: 400 }
      );
    }

    const fixtureMeta = resolvedTarget.fixtureId ? PUBLIC_FIXTURES[resolvedTarget.fixtureId] : undefined;
    const effectiveProjectName =
      projectName ||
      fixtureMeta?.name ||
      validation.projectName ||
      path.basename(validation.canonicalPath);

    const result = await scanRepository({
      rootPath: validation.canonicalPath,
      projectName: effectiveProjectName,
      useCache: useCache ?? false,
      maxFiles: maxFiles || 15000,
    });

    const safePayload = resolvedTarget.isFixture
      ? sanitizeServerPaths(
          {
            success: true,
            graph: result.graph,
            durationMs: result.durationMs,
            scannedFilesCount: result.scannedFilesCount,
            diagnostics: result.diagnostics,
            fromCache: result.fromCache ?? false,
            canonicalPath: resolvedTarget.displayPath,
          },
          validation.canonicalPath,
          resolvedTarget.displayPath
        )
      : {
          success: true,
          graph: result.graph,
          durationMs: result.durationMs,
          scannedFilesCount: result.scannedFilesCount,
          diagnostics: result.diagnostics,
          fromCache: result.fromCache ?? false,
          canonicalPath: validation.canonicalPath,
        };

    return NextResponse.json(safePayload);
  } catch {
    return NextResponse.json(
      {
        error: 'Internal scanner execution error',
        code: 'SCANNER_EXECUTION_ERROR',
      },
      { status: 500 }
    );
  }
}
