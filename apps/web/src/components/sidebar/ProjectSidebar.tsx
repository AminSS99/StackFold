'use client';

import React from 'react';
import {
  FolderGit2,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  Layers,
  Globe,
  Database,
  Cloud,
  KeyRound,
  FileCode,
  Component as ComponentIcon,
  Clock,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { NodeType, DensityLevel } from '@stackfold/graph';

const NODE_TYPE_ITEMS: Array<{ type: NodeType; label: string; icon: React.ReactNode; color: string }> = [
  { type: 'application', label: 'Applications', icon: <Layers className="w-3.5 h-3.5" />, color: 'text-purple-400' },
  { type: 'api_route', label: 'API Routes', icon: <Globe className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  { type: 'database_model', label: 'Database Models', icon: <Database className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  { type: 'external_service', label: 'External Services', icon: <Cloud className="w-3.5 h-3.5" />, color: 'text-sky-400' },
  { type: 'environment_variable', label: 'Environment Vars', icon: <KeyRound className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { type: 'source_module', label: 'Source Modules', icon: <FileCode className="w-3.5 h-3.5" />, color: 'text-slate-400' },
  { type: 'component', label: 'Components', icon: <ComponentIcon className="w-3.5 h-3.5" />, color: 'text-violet-400' },
];

export function ProjectSidebar() {
  const scan = useStackfoldStore(s => s.scan);
  const isLoading = useStackfoldStore(s => s.isLoading);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const scanStats = useStackfoldStore(s => s.scanStats);
  const currentRootPath = useStackfoldStore(s => s.currentRootPath);
  const enabledNodeTypes = useStackfoldStore(s => s.enabledNodeTypes);
  const toggleNodeType = useStackfoldStore(s => s.toggleNodeType);
  const resetNodeTypeFilters = useStackfoldStore(s => s.resetNodeTypeFilters);
  const setOnboardingModalOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const density = useStackfoldStore(s => s.density);
  const setDensity = useStackfoldStore(s => s.setDensity);

  if (!rawGraph) {
    return null;
  }

  const handleRescan = () => {
    if (!currentRootPath) return;
    if (currentRootPath.startsWith('[Fixture] ')) {
      const fixtureId = currentRootPath.replace('[Fixture] ', '').trim();
      scan({ fixture: fixtureId, useCache: false });
    } else {
      scan({ rootPath: currentRootPath, useCache: false });
    }
  };

  const nodeCounts = rawGraph?.metadata.stats.nodeTypeCounts || ({} as Record<NodeType, number>);

  return (
    <aside className="w-72 bg-[#0c0e16] border-r border-[#1c2233] flex flex-col h-full select-none text-xs">
      {/* Current Project Header */}
      <div className="p-4 border-b border-[#1c2233] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[13px] truncate">
            <FolderGit2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{rawGraph.metadata.projectName}</span>
          </span>
          <button
            onClick={() => setOnboardingModalOpen(true)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline shrink-0"
          >
            Change
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-mono truncate">
          {currentRootPath}
        </div>

        <button
          onClick={handleRescan}
          disabled={isLoading}
          className="w-full py-2 px-3 bg-[#181d2f] hover:bg-[#22293e] active:bg-[#121522] border border-[#2d354e] rounded-xl text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5 text-indigo-400', isLoading && 'animate-spin')} />
          <span>{isLoading ? 'Scanning...' : 'Rescan Project'}</span>
        </button>
      </div>

      {/* Project Overview Stats */}
      <div className="p-4 border-b border-[#1c2233] space-y-2 bg-[#0e111b]/50">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Scan Diagnostics
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded bg-[#141724] border border-[#222738]">
            <div className="text-slate-500 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Files
            </div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">
              {scanStats?.scannedFilesCount || 0}
            </div>
          </div>
          <div className="p-2 rounded bg-[#141724] border border-[#222738]">
            <div className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Duration
            </div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">
              {scanStats?.durationMs || 0} ms
            </div>
          </div>
        </div>

        {rawGraph.metadata.frameworks.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] text-slate-500 mb-1">Detected Frameworks:</div>
            <div className="flex flex-wrap gap-1">
              {rawGraph.metadata.frameworks.map(fw => (
                <span
                  key={fw}
                  className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[10px]"
                >
                  {fw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Density Filter */}
      <div className="p-4 border-b border-[#1c2233] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Graph Density
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-[#121522] p-1 rounded-xl border border-[#222738]">
          {(['overview', 'standard', 'detailed'] as DensityLevel[]).map(d => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={clsx(
                'py-1 text-center rounded-lg text-[10px] capitalize font-medium transition-colors',
                density === d ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Node Type Filters */}
      <div className="p-4 flex-1 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[12px]">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            Node Type Filters
          </span>
          <button
            onClick={resetNodeTypeFilters}
            className="text-[10px] text-slate-400 hover:text-slate-200"
          >
            Reset
          </button>
        </div>

        <div className="space-y-1 pt-1">
          {NODE_TYPE_ITEMS.map(item => {
            const isChecked = enabledNodeTypes.has(item.type);
            const count = nodeCounts[item.type] || 0;

            return (
              <button
                key={item.type}
                onClick={() => toggleNodeType(item.type)}
                className={clsx(
                  'w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left',
                  isChecked
                    ? 'bg-[#141724] border border-[#222738] text-slate-200 hover:bg-[#1a1e2f]'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-[#11131e]'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                  <span className={clsx('shrink-0', item.color)}>{item.icon}</span>
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#1c2233] text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
