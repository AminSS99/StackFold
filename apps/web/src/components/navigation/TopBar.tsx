'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ArrowRightLeft, Database, Download, FolderGit2, GitBranch, Github, Layers, PanelLeft, Search, Sparkles, Workflow } from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { IconButton } from '@/components/ui/IconButton';
import { stackfoldLinks } from '@/config/links';
import type { GraphViewType } from '@stackfold/graph';

const VIEWS: Array<{ id: GraphViewType; label: string; icon: React.ReactNode }> = [
  { id: 'architecture', label: 'Architecture', icon: <Layers className="h-4 w-4" /> },
  { id: 'api_flow', label: 'API flows', icon: <Workflow className="h-4 w-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="h-4 w-4" /> },
  { id: 'dependencies', label: 'Dependencies', icon: <GitBranch className="h-4 w-4" /> },
];

interface TopBarProps { filtersOpen: boolean; onToggleFilters: () => void; }

export function TopBar({ filtersOpen, onToggleFilters }: TopBarProps) {
  const activeView = useStackfoldStore(s => s.activeView);
  const setActiveView = useStackfoldStore(s => s.setActiveView);
  const layoutDirection = useStackfoldStore(s => s.layoutDirection);
  const setLayoutDirection = useStackfoldStore(s => s.setLayoutDirection);
  const setCommandPaletteOpen = useStackfoldStore(s => s.setCommandPaletteOpen);
  const isDiagnosticsDrawerOpen = useStackfoldStore(s => s.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useStackfoldStore(s => s.setDiagnosticsDrawerOpen);
  const setOnboardingModalOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const setExportModalOpen = useStackfoldStore(s => s.setExportModalOpen);
  const setAiAssistantOpen = useStackfoldStore(s => s.setAiAssistantOpen);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const viewCounts = useMemo(() => {
    if (!rawGraph) return { architecture: 0, api_flow: 0, database: 0, dependencies: 0 };
    return { architecture: rawGraph.nodes.length, api_flow: rawGraph.nodes.filter(n => n.type === 'api_route').length, database: rawGraph.nodes.filter(n => n.type === 'database_model').length, dependencies: rawGraph.nodes.filter(n => ['package', 'source_module', 'application'].includes(n.type)).length };
  }, [rawGraph]);
  const diagnosticsCount = rawGraph?.diagnostics?.length || 0;

  return <header className="z-30 shrink-0 border-b border-[#2a2d24] bg-[#0d0f0c]/95 backdrop-blur-xl">
    <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
      <button onClick={() => setOnboardingModalOpen(true)} className="flex min-w-0 items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[#1b1e17]" aria-label="Open project picker">
        <Image src="/logo.png" alt="Stackfold" width={28} height={28} className="h-7 w-7 rounded-md" priority />
        <span className="hidden text-[13px] font-bold tracking-[0.16em] text-[#f6f7f2] sm:block">STACKFOLD</span>
      </button>
      <div className="hidden h-5 w-px bg-[#2a2d24] md:block" />
      <button onClick={() => setOnboardingModalOpen(true)} className="hidden min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#d9ddd0] transition-colors hover:bg-[#1b1e17] md:flex">
        <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-[#f6c945]" /><span className="max-w-40 truncate">{rawGraph?.metadata.projectName || 'Open repository'}</span>
        {rawGraph && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#62d49b]" aria-label="Scanned locally" />}
      </button>
      {rawGraph && <span className="hidden text-[11px] text-[#74796d] xl:block">Scanned locally · no secret values read</span>}
      <div className="ml-auto flex items-center gap-1.5">
        {rawGraph && <>
          <button onClick={() => setCommandPaletteOpen(true)} className="hidden h-10 items-center gap-2 rounded-lg border border-[#34382e] bg-[#141611] px-3 text-xs text-[#a5aa9b] transition-colors hover:border-[#676d58] hover:text-[#f6f7f2] lg:flex"><Search className="h-3.5 w-3.5" /><span>Search</span><kbd className="font-mono text-[10px] text-[#74796d]">⌘K</kbd></button>
          <IconButton label={filtersOpen ? 'Hide graph filters' : 'Show graph filters'} onClick={onToggleFilters} className={clsx('hidden lg:grid', filtersOpen && 'border-[#f6c945]/50 bg-[#f6c945]/10 text-[#f6c945]')}><PanelLeft className="h-4 w-4" /></IconButton>
          <IconButton label="Switch graph direction" onClick={() => setLayoutDirection(layoutDirection === 'LR' ? 'TB' : 'LR')} className="hidden xl:grid"><ArrowRightLeft className="h-4 w-4" /></IconButton>
          <IconButton label="Export architecture" onClick={() => setExportModalOpen(true)} className="hidden xl:grid"><Download className="h-4 w-4" /></IconButton>
          <IconButton label="Ask Stackfold" onClick={() => setAiAssistantOpen(true)} className="hidden 2xl:grid border-[#f6c945]/35 bg-[#f6c945]/10 text-[#f6c945]"><Sparkles className="h-4 w-4" /></IconButton>
          <IconButton label={`Diagnostics${diagnosticsCount ? ` (${diagnosticsCount})` : ''}`} onClick={() => setDiagnosticsDrawerOpen(!isDiagnosticsDrawerOpen)} className={clsx(diagnosticsCount > 0 && 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]')}><AlertTriangle className="h-4 w-4" /></IconButton>
        </>}
        {!rawGraph && <Link href="/download" className="hidden rounded-lg bg-[#f6c945] px-3 py-2 text-xs font-semibold text-[#070806] transition-colors hover:bg-[#ffda67] sm:block">Download</Link>}
        <a href={stackfoldLinks.repository} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-lg border border-[#34382e] text-[#a5aa9b] transition-colors hover:border-[#676d58] hover:text-[#f6f7f2]" aria-label="View Stackfold on GitHub" title="View Stackfold on GitHub"><Github className="h-4 w-4" /></a>
      </div>
    </div>
    {rawGraph && <nav aria-label="Architecture views" className="flex h-11 items-end gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-4">
      {VIEWS.map(view => { const active = activeView === view.id; return <button key={view.id} onClick={() => setActiveView(view.id)} className={clsx('flex h-10 items-center gap-2 border-b-2 px-3 text-xs font-medium whitespace-nowrap transition-colors', active ? 'border-[#f6c945] text-[#f6f7f2]' : 'border-transparent text-[#74796d] hover:text-[#d9ddd0]')}><span className={active ? 'text-[#f6c945]' : ''}>{view.icon}</span><span>{view.label}</span><span className="font-mono text-[10px] text-[#74796d]">{viewCounts[view.id]}</span></button>; })}
    </nav>}
  </header>;
}
