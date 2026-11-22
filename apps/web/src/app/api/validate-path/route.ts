import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRepositoryPath } from '@stackfold/scanner';
import {
  checkRateLimit,
  extractFixtureIdFromPath,
  isHostedEnvironment,
  PUBLIC_FIXTURES,
  resolveSafeTarget,
} from '@/lib/server-security';

export const dynamic = 'force-static';

const validateRequestSchema = z.object({
  path: z.string().min(1).max(1024),
});

export async function POST(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-validate-path', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    const parsed = validateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          isValid: false,
          error: 'Directory path is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    const inputPath = parsed.data.path.trim();
    const fixtureId = extractFixtureIdFromPath(inputPath);
    if (fixtureId && fixtureId in PUBLIC_FIXTURES) {
      const target = resolveSafeTarget({ req, fixture: fixtureId });
      const check = validateRepositoryPath(target.physicalRoot);
      return NextResponse.json({
        ...check,
        canonicalPath: target.displayPath,
        projectName: PUBLIC_FIXTURES[fixtureId]?.name || check.projectName,
      });
    }

    if (isHostedEnvironment(req)) {
      return NextResponse.json(
        {
          isValid: false,
          hasPackageJson: false,
          hasTsConfig: false,
          hasPrisma: false,
          isMonorepo: false,
          errorCode: 'HOSTED_DEMO_RESTRICTED',
          errorMessage:
            'Local filesystem path probing is disabled on the public hosted web app. Select a bundled fixture below, or run Stackfold locally / on desktop.',
        },
        { status: 403 }
      );
    }

    const result = validateRepositoryPath(inputPath);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        isValid: false,
        error: 'Path validation failed',
        code: 'VALIDATION_ERROR',
      },
      { status: 500 }
    );
  }
}
