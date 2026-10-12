import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, sharedLinks, architectureSnapshots, projects } from '@/db';
import { eq } from 'drizzle-orm';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Share2, Layers, Calendar } from 'lucide-react';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return [{ token: 'preview' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Shared Architecture Map (${token}) — Stackfold`,
    description: 'Interactive architecture map shared via Stackfold Cloud.',
  };
}

export default async function SharedMapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getDb();

  if (!db) {
    return notFound();
  }

  const [linkRecord] = await db
    .select({
      link: sharedLinks,
      snapshot: architectureSnapshots,
      project: projects,
    })
    .from(sharedLinks)
    .innerJoin(architectureSnapshots, eq(sharedLinks.snapshotId, architectureSnapshots.id))
    .innerJoin(projects, eq(architectureSnapshots.projectId, projects.id))
    .where(eq(sharedLinks.shareToken, token))
    .limit(1);

  if (!linkRecord) {
    return notFound();
  }

  // Check expiration if set
  if (linkRecord.link.expiresAt && new Date(linkRecord.link.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-[#070806] text-[#f6f7f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 max-w-md bg-[#0d0f0c] border border-[#2a2d24] rounded-2xl space-y-4">
          <h1 className="text-xl font-bold text-[#ff6b6b]">Link Expired</h1>
          <p className="text-xs text-[#a5aa9b]">
            This shared architecture snapshot link has expired. Please request a new link from the project owner.
          </p>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Return to Stackfold
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { project, snapshot } = linkRecord;

  return (
    <div className="min-h-screen bg-[#070806] text-[#f6f7f2] flex flex-col overflow-hidden">
      {/* Shared Header */}
      <header className="h-14 px-4 bg-[#0d0f0c] border-b border-[#2a2d24] flex items-center justify-between gap-4 z-30 select-none shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Logo size="sm" showText={false} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[#f6f7f2]">{project.name}</span>
            <Badge variant="yellow" size="sm">
              {snapshot.versionLabel}
            </Badge>
            <span className="text-[#74796d] hidden sm:inline">•</span>
            <span className="text-[11px] text-[#a5aa9b] font-mono hidden sm:inline">
              {snapshot.nodeCount} nodes / {snapshot.edgeCount} edges
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#74796d]">
            <Calendar className="w-3 h-3" />
            <span>{new Date(snapshot.createdAt).toLocaleDateString()}</span>
          </div>
          <Link href="/">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open in Studio
            </Button>
          </Link>
        </div>
      </header>

      {/* Interactive Read-Only Preview Notice & Canvas Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center sf-grid relative">
        <div className="p-8 max-w-lg bg-[#0d0f0c]/90 border border-[#2a2d24] backdrop-blur-md rounded-2xl shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(246,201,69,0.12)] border border-[#f6c945]/30 text-[#f6c945] flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#f6f7f2]">{project.name}</h2>
            <p className="text-xs text-[#a5aa9b] leading-relaxed">
              {project.description || 'Shared architecture system map snapshot.'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[#74796d] block text-[10px]">Entities:</span>
              <span className="text-[#f6c945] font-bold">{snapshot.nodeCount}</span>
            </div>
            <div>
              <span className="text-[#74796d] block text-[10px]">Relationships:</span>
              <span className="text-[#f6f7f2] font-bold">{snapshot.edgeCount}</span>
            </div>
          </div>

          <Link href="/" className="block">
            <Button variant="primary" size="md" className="w-full">
              Explore Architecture Graph in Studio
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
