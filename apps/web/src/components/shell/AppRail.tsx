'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Layers,
  Workflow,
  Database,
  Boxes,
  FolderGit2,
  Search,
  Download,
  Github,
  ShieldCheck,
} from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { GraphViewType } from '@stackfold/graph';
import { Logo } from '@/components/ui/Logo';
import { Tooltip } from '@/components/ui/Tooltip';
import { UserAuthButton } from '@/components/cloud/UserAuthButton';
import { stackfoldLinks } from '@/config/links';
import { currentRelease } from '@/config/release';

interface ViewDefinition {
  id: GraphViewType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

const VIEWS: ViewDefinition[] = [
  { id: 'architecture', label: 'Architecture', icon: <Layers className="w-4 h-4" />, shortcut: '1' },
  { id: 'api_flow', label: 'API Flow', icon: <Workflow className="w-4 h-4" />, shortcut: '2' },
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" />, shortcut: '3' },
  { id: 'dependencies', label: 'Dependencies', icon: <Boxes className="w-4 h-4" />, shortcut: '4' },
];

export function AppRail() {
  const pathname = usePathname();
  const router = useRouter();
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const activeView = useStackfoldStore(s => s.activeView);
  const setActiveView = useStackfoldStore(s => s.setActiveView);
  const setOnboardingModalOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const setCommandPaletteOpen = useStackfoldStore(s => s.setCommandPaletteOpen);

  const viewCounts = React.useMemo(() => {
    if (!rawGraph) return { architecture: 0, api_flow: 0, database: 0, dependencies: 0 };
    const counts = rawGraph.metadata.stats.nodeTypeCounts || {};
    return {
      architecture:
        (counts.application || 0) +
        (counts.package || 0) +
        (counts.directory || 0) +
        (counts.source_module || 0) +
        (counts.component || 0),
      api_flow: counts.api_route || 0,
      database: counts.database_model || 0,
      dependencies: counts.package || 0,
    };
  }, [rawGraph]);

  return (
    <aside className="w-16 md:w-56 bg-[#0d0f0c] border-r border-[#2a2d24] flex flex-col justify-between h-full select-none shrink-0 z-20">
      {/* Top Section: Logo & Project Switcher */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-14 px-3 md:px-4 flex items-center justify-between border-b border-[#2a2d24]">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Logo size="sm" showText={false} />
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-xs tracking-wider text-[#f6f7f2]">STACKFOLD</span>
              <span className="text-[10px] font-mono text-[#a5aa9b] leading-tight">
                {currentRelease.version}
              </span>
            </div>
          </Link>
        </div>

        {/* Project Switcher */}
        <div className="p-2 border-b border-[#2a2d24]">
          <Tooltip content="Open or switch project" side="right">
            <button
              onClick={() => pathname === '/security-lab' ? router.push('/') : setOnboardingModalOpen(true)}
              className="w-full flex items-center justify-center md:justify-start gap-2.5 p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] hover:border-[#3b3f31] text-[#f6f7f2] transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-[#f6c945] shrink-0" />
              <div className="hidden md:flex flex-col min-w-0 text-left">
                <span className="text-xs font-semibold truncate leading-tight">
                  {rawGraph ? rawGraph.metadata.projectName : 'Open Project'}
                </span>
                <span className="text-[10px] text-[#a5aa9b] leading-tight">
                  {rawGraph ? 'Switch repository' : 'Click to scan'}
                </span>
              </div>
            </button>
          </Tooltip>
        </div>

        {/* Views Switcher */}
        {rawGraph && (
          <nav className="p-2 space-y-1" aria-label="Architecture Graph Views">
            <div className="hidden md:block px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#74796d]">
              Views
            </div>
            {VIEWS.map(v => {
              const isActive = activeView === v.id;
              const count = viewCounts[v.id] ?? 0;
              return (
                <Tooltip key={v.id} content={`${v.label} (Press ${v.shortcut})`} side="right">
                  <button
                    onClick={() => setActiveView(v.id)}
                    className={clsx(
                      'w-full flex items-center justify-center md:justify-between p-2 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[#f6c945] text-[#070806] font-semibold shadow-sm'
                        : 'text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611]'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{v.icon}</span>
                      <span className="hidden md:inline truncate">{v.label}</span>
                    </div>
                    <span
                      className={clsx(
                        'hidden md:inline font-mono text-[10px] px-1.5 py-0.2 rounded',
                        isActive
                          ? 'bg-[#070806]/20 text-[#070806]'
                          : 'bg-[#1b1e17] text-[#a5aa9b]'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </nav>
        )}

        <div className="px-2 pb-1">
          <Tooltip content="Security Lab" side="right">
            <Link
              href="/security-lab"
              className={clsx(
                'w-full flex items-center justify-center md:justify-start gap-2 p-2 rounded-lg text-xs font-medium transition-colors',
                pathname === '/security-lab'
                  ? 'bg-[#f6c945]/12 text-[#f6c945] border border-[#f6c945]/35'
                  : 'text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] border border-transparent'
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline truncate">Security Lab</span>
            </Link>
          </Tooltip>
        </div>

        {/* Global Search Trigger */}
        <div className="p-2">
          <Tooltip content="Command Search (⌘K)" side="right">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-center md:justify-between p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6f7f2] transition-colors text-xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Search...</span>
              </div>
              <kbd className="hidden md:inline font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#1b1e17] border border-[#2a2d24] text-[#74796d]">
                ⌘K
              </kbd>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Bottom Section: Download Desktop & GitHub */}
      <div className="p-2 border-t border-[#2a2d24] space-y-1">
        <Tooltip content="Download Native macOS App" side="right">
          <Link
            href="/download"
            className="w-full flex items-center justify-center md:justify-start gap-2 p-2 rounded-lg text-xs font-medium text-[#f6c945] hover:bg-[#141611] transition-colors"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline truncate">Desktop App</span>
          </Link>
        </Tooltip>

        <Tooltip content="View on GitHub" side="right">
          <a
            href={stackfoldLinks.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center md:justify-start gap-2 p-2 rounded-lg text-xs text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] transition-colors"
          >
            <Github className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline truncate">GitHub Repo</span>
          </a>
        </Tooltip>

        {/* User Account / Clerk Auth Widget */}
        <div className="pt-1">
          <UserAuthButton />
        </div>
      </div>
    </aside>
  );
}
