'use client';

import React from 'react';
import {
  Layers,
  Workflow,
  Database,
  GitBranch,
  Search,
  AlertTriangle,
  Download,
  ArrowRightLeft,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { GraphViewType } from '@stackfold/graph';

const VIEWS: Array<{ id: GraphViewType; label: string; icon: React.ReactNode }> = [
  { id: 'architecture', label: 'Architecture', icon: <Layers className="w-4 h-4" /> },
  { id: 'api_flow', label: 'API Flows', icon: <Workflow className="w-4 h-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'dependencies', label: 'Dependencies', icon: <GitBranch className="w-4 h-4" /> },
];

export function TopBar() {
  const activeView = useStackfoldStore(s => s.activeView);
  const setActiveView = useStackfoldStore(s => s.setActiveView);
  const layoutDirection = useStackfoldStore(s => s.layoutDirection);
  const setLayoutDirection = useStackfoldStore(s => s.setLayoutDirection);
  const setCommandPaletteOpen = useStackfoldStore(s => s.setCommandPaletteOpen);
  const isDiagnosticsDrawerOpen = useStackfoldStore(s => s.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useStackfoldStore(s => s.setDiagnosticsDrawerOpen);
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  const diagnosticsCount = rawGraph?.diagnostics?.length || 0;

  const handleExportJson = () => {
    if (!rawGraph) return;
    const blob = new Blob([JSON.stringify(rawGraph, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stackfold-graph-${rawGraph.metadata.projectName || 'project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-14 bg-[#0d0f17] border-b border-[#1c2233] px-4 flex items-center justify-between gap-4 select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 tracking-tight">STACKFOLD</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                v0.1-mvp
              </span>
            </div>
          </div>
        </div>

        {rawGraph && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#222738] text-xs text-slate-400">
            <span className="text-slate-200 font-medium">{rawGraph.metadata.projectName}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-[11px] text-slate-400">
              {rawGraph.metadata.stats.nodeCount} nodes, {rawGraph.metadata.stats.edgeCount} edges
            </span>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center bg-[#131622] p-1 rounded-xl border border-[#222738]">
        {VIEWS.map(v => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2233]'
              )}
            >
              {v.icon}
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Utility Actions */}
      <div className="flex items-center gap-2">
        {/* Search / Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141724] border border-[#222738] hover:border-[#38415f] text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search graph...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#1e2336] text-slate-400 font-mono text-[10px] border border-[#2d354e]">
            ⌘K
          </kbd>
        </button>

        {/* Layout direction toggle */}
        <button
          onClick={() => setLayoutDirection(layoutDirection === 'LR' ? 'TB' : 'LR')}
          title={`Switch layout to ${layoutDirection === 'LR' ? 'Vertical (TB)' : 'Horizontal (LR)'}`}
          className="p-2 rounded-lg bg-[#141724] border border-[#222738] hover:border-[#38415f] text-slate-400 hover:text-slate-200 transition-colors"
        >
          {layoutDirection === 'LR' ? (
            <ArrowRightLeft className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </button>

        {/* Export JSON */}
        <button
          onClick={handleExportJson}
          title="Export Graph as JSON"
          disabled={!rawGraph}
          className="p-2 rounded-lg bg-[#141724] border border-[#222738] hover:border-[#38415f] text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Diagnostics button */}
        <button
          onClick={() => setDiagnosticsDrawerOpen(!isDiagnosticsDrawerOpen)}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
            diagnosticsCount > 0
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50'
              : 'bg-[#141724] border-[#222738] text-slate-400 hover:text-slate-200'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Diagnostics</span>
          {diagnosticsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {diagnosticsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
