import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ScanCacheManager } from '@stackfold/scanner';

export const dynamic = 'force-static';

const deleteCacheSchema = z.object({
  rootPath: z.string().min(1),
});

export async function GET() {
  try {
    const cacheManager = new ScanCacheManager();
    const artifacts = await cacheManager.listArtifacts();
    return NextResponse.json({ cachedScans: artifacts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list cache';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const parsed = deleteCacheSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'rootPath is required' }, { status: 400 });
    }

    const cacheManager = new ScanCacheManager();
    const success = await cacheManager.invalidateArtifact(parsed.data.rootPath);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete cache artifact';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
