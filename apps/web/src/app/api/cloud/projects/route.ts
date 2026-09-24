import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDb, users, projects, architectureSnapshots } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-static';

const saveProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  repositoryUrl: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  versionLabel: z.string().optional(),
  graphData: z.record(z.unknown()),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  scanStats: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Neon database not configured. Please set DATABASE_URL.' },
        { status: 503 }
      );
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ projects: userProjects });
  } catch (err: unknown) {
    console.error('Error fetching cloud projects:', err);
    return NextResponse.json(
      { error: 'Failed to fetch cloud projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Neon database not configured. Please set DATABASE_URL.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parseResult = saveProjectSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Ensure user exists in db
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

    // Create project
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

    // Create architecture snapshot
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
      project: newProject,
      snapshot,
    });
  } catch (err: unknown) {
    console.error('Error saving cloud project:', err);
    return NextResponse.json(
      { error: 'Failed to save project to Neon database' },
      { status: 500 }
    );
  }
}
