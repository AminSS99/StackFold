import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDb, sharedLinks, architectureSnapshots, projects } from '@/db';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/server-security';

export const dynamic = 'force-static';

const shareRequestSchema = z.object({
  snapshotId: z.string().uuid(),
  accessLevel: z.enum(['view', 'restricted']).optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export async function POST(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-cloud-share-post', 15, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Cloud database not configured.' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parseResult = shareRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { snapshotId, accessLevel = 'view', expiresInDays } = parseResult.data;

    // Enforce strict tenant ownership (RLS check): verify the snapshot exists AND belongs to the authenticated user's project.
    const [ownedSnapshot] = await db
      .select({
        snapshotId: architectureSnapshots.id,
      })
      .from(architectureSnapshots)
      .innerJoin(projects, eq(architectureSnapshots.projectId, projects.id))
      .where(and(eq(architectureSnapshots.id, snapshotId), eq(projects.userId, user.id)))
      .limit(1);

    if (!ownedSnapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Use 24-character cryptographic token (144 bits of entropy) to prevent brute-force guessing.
    const shareToken = nanoid(24);
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

    const safeOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const shareUrl = `${safeOrigin.replace(/\/+$/, '')}/share/${shareToken}`;

    return NextResponse.json({
      link: link
        ? {
            shareToken: link.shareToken,
            accessLevel: link.accessLevel,
            expiresAt: link.expiresAt,
          }
        : null,
      shareUrl,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
