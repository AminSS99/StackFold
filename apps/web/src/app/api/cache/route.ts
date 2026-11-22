import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ScanCacheManager } from '@stackfold/scanner';
import { checkRateLimit, isHostedEnvironment } from '@/lib/server-security';

export const dynamic = 'force-static';

const deleteCacheSchema = z.object({
  rootPath: z.string().min(1).max(1024),
});

export async function GET(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-cache-get', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  // On hosted public deployments, do not expose shared server cache artifacts across visitors.
  if (isHostedEnvironment(req)) {
    return NextResponse.json({ cachedScans: [] });
  }

  try {
    const cacheManager = new ScanCacheManager();
    const artifacts = await cacheManager.listArtifacts();
    return NextResponse.json({ cachedScans: artifacts });
  } catch {
    return NextResponse.json({ error: 'Failed to list cache' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-cache-delete', 20, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  if (isHostedEnvironment(req)) {
    return NextResponse.json(
      { error: 'Cache modification is disabled on public hosted deployments', code: 'HOSTED_DEMO_RESTRICTED' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = deleteCacheSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'rootPath is required' }, { status: 400 });
    }

    const cacheManager = new ScanCacheManager();
    const success = await cacheManager.invalidateArtifact(parsed.data.rootPath);
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: 'Failed to delete cache artifact' }, { status: 500 });
  }
}
