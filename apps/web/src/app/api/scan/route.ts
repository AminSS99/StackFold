import { NextResponse } from 'next/server';
import path from 'node:path';
import { z } from 'zod';
import { scanRepository, validateRepositoryPath } from '@stackfold/scanner';

export const dynamic = 'force-static';

const scanRequestSchema = z.object({
  rootPath: z.string().optional(),
  fixture: z.string().optional(),
  projectName: z.string().optional(),
  useCache: z.boolean().optional(),
  maxFiles: z.number().int().positive().max(50000).optional(),
});

export async function POST(req: Request) {
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
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { fixture, rootPath: rawRootPath, projectName, useCache, maxFiles } = parseResult.data;
    let targetPath: string | undefined;

    if (fixture) {
      if (fixture === 'sample-ecommerce-app') {
        targetPath = path.resolve(process.cwd(), '../../fixtures/sample-ecommerce-app');
      } else if (fixture === 'sample-monorepo-platform') {
        targetPath = path.resolve(process.cwd(), '../../fixtures/sample-monorepo-platform');
      } else if (fixture === 'stackfold-self') {
        targetPath = path.resolve(process.cwd(), '../../');
      } else {
        return NextResponse.json(
          {
            error: `Unknown bundled fixture: '${fixture}'`,
            code: 'UNKNOWN_FIXTURE',
          },
          { status: 400 }
        );
      }
    } else if (rawRootPath) {
      targetPath = rawRootPath;
    }

    if (!targetPath) {
      return NextResponse.json(
        {
          error: 'Either rootPath or fixture identifier must be provided',
          code: 'MISSING_TARGET_PATH',
        },
        { status: 400 }
      );
    }

    // Validate path & security bounds
    const validation = validateRepositoryPath(targetPath);
    if (!validation.isValid || !validation.canonicalPath) {
      return NextResponse.json(
        {
          error: validation.errorMessage || 'Invalid repository path',
          code: validation.errorCode || 'INVALID_PATH',
        },
        { status: 400 }
      );
    }

    const result = await scanRepository({
      rootPath: validation.canonicalPath,
      projectName: projectName || validation.projectName || path.basename(validation.canonicalPath),
      useCache: useCache ?? false,
      maxFiles: maxFiles || 15000,
    });

    return NextResponse.json({
      success: true,
      graph: result.graph,
      durationMs: result.durationMs,
      scannedFilesCount: result.scannedFilesCount,
      diagnostics: result.diagnostics,
      fromCache: result.fromCache ?? false,
      canonicalPath: validation.canonicalPath,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal scanner error';
    return NextResponse.json(
      {
        error: message,
        code: 'SCANNER_EXECUTION_ERROR',
      },
      { status: 500 }
    );
  }
}
