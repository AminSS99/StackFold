import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDb, sharedLinks, architectureSnapshots } from '@/db';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-static';

const shareRequestSchema = z.object({
  snapshotId: z.string().uuid(),
  accessLevel: z.enum(['view', 'restricted']).optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Neon database not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parseResult = shareRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { snapshotId, accessLevel = 'view', expiresInDays } = parseResult.data;

    // Verify snapshot exists
    const [snapshot] = await db
      .select()
      .from(architectureSnapshots)
      .where(eq(architectureSnapshots.id, snapshotId))
      .limit(1);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const shareToken = nanoid(12);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [link] = await db
      .insert(sharedLinks)
      .values({
        snapshotId,
        shareToken,
        accessLevel,
        expiresAt,
      })
      .returning();

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const shareUrl = `${origin}/share/${shareToken}`;

    return NextResponse.json({
      link,
      shareUrl,
    });
  } catch (err: unknown) {
    console.error('Error generating share link:', err);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
