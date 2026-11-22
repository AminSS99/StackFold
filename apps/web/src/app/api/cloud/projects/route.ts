import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDb, users, projects, architectureSnapshots } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/server-security';

export const dynamic = 'force-static';

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB cap

const saveProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  repositoryUrl: z
    .string()
    .url()
    .refine(val => val.startsWith('https://') || val.startsWith('http://'), {
      message: 'Repository URL must use http or https protocol',
    })
    .optional()
    .or(z.literal('')),
  isPublic: z.boolean().optional(),
  versionLabel: z.string().max(64).optional(),
  graphData: z.record(z.unknown()),
  nodeCount: z.number().int().nonnegative().max(100000),
  edgeCount: z.number().int().nonnegative().max(250000),
  scanStats: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-cloud-projects-get', 30, 60_000);
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

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ projects: userProjects });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch cloud projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const rateLimitResponse = checkRateLimit(req, 'api-cloud-projects-post', 15, 60_000);
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

    const rawText = await req.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Snapshot payload exceeds the 2 MB size limit.' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parseResult = saveProjectSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || null,
        displayName: user.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user.username || 'User',
        avatarUrl: user.imageUrl || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.emailAddresses[0]?.emailAddress || null,
          displayName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user.username || 'User',
          avatarUrl: user.imageUrl || null,
        },
      });

    const [newProject] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: data.name,
        description: data.description || null,
        repositoryUrl: data.repositoryUrl || null,
        isPublic: data.isPublic || false,
      })
      .returning();

    if (!newProject) {
      throw new Error('Failed to create project record in database');
    }

    const [snapshot] = await db
      .insert(architectureSnapshots)
      .values({
        projectId: newProject.id,
        versionLabel: data.versionLabel || 'v1.0.0',
        nodeCount: data.nodeCount,
        edgeCount: data.edgeCount,
        graphData: data.graphData,
        scanStats: data.scanStats || null,
      })
      .returning();

    return NextResponse.json({
      project: {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        isPublic: newProject.isPublic,
        createdAt: newProject.createdAt,
      },
      snapshot: snapshot
        ? {
            id: snapshot.id,
            versionLabel: snapshot.versionLabel,
            nodeCount: snapshot.nodeCount,
            edgeCount: snapshot.edgeCount,
            createdAt: snapshot.createdAt,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save project snapshot' },
      { status: 500 }
    );
  }
}
