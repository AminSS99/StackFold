import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRepositoryPath } from '@stackfold/scanner';

export const dynamic = 'force-static';

const validateRequestSchema = z.object({
  path: z.string().min(1),
});

export async function POST(req: Request) {
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

    const result = validateRepositoryPath(parsed.data.path);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Path validation failed';
    return NextResponse.json(
      {
        isValid: false,
        error: message,
        code: 'VALIDATION_ERROR',
      },
      { status: 500 }
    );
  }
}
