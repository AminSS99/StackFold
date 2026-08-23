'use client';

import React, { useState } from 'react';
import {
  FolderGit2,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Globe,
  Database,
  Cloud,
  KeyRound,
  FileCode,
  Component as ComponentIcon,
  ChevronRight,
  Clock,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { NodeType } from '@stackfold/graph';

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
  const enabledNodeTypes = useStackfoldStore(s => s.enabledNodeTypes);
  const toggleNodeType = useStackfoldStore(s => s.toggleNodeType);
  const resetNodeTypeFilters = useStackfoldStore(s => s.resetNodeTypeFilters);

  const [selectedFixture, setSelectedFixture] = useState('sample-ecommerce-app');
  const [customPath, setCustomPath] = useState('');
  const [useCustomPath, setUseCustomPath] = useState(false);

  const handleScan = () => {
    if (useCustomPath && customPath.trim()) {
      scan({ rootPath: customPath.trim() });
    } else {
      scan({ fixture: selectedFixture });
    }
  };

  const nodeCounts = rawGraph?.metadata.stats.nodeTypeCounts || ({} as Record<NodeType, number>);

  return (
    <aside className="w-72 bg-[#0c0e16] border-r border-[#1c2233] flex flex-col h-full select-none text-xs">
      {/* Repository Picker Header */}
      <div className="p-4 border-b border-[#1c2233] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[13px]">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            Project Onboarding
          </span>
        </div>

        {/* Fixture vs Custom Selector */}
        <div className="space-y-2">
          {!useCustomPath ? (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Target Repository</label>
              <select
                value={selectedFixture}
                onChange={e => setSelectedFixture(e.target.value)}
                className="w-full bg-[#141724] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="sample-ecommerce-app">Sample E-Commerce Store (Next.js + Prisma)</option>
                <option value="stackfold-self">Stackfold Monorepo (Self Scan)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Local Directory Path</label>
              <input
                type="text"
                value={customPath}
                onChange={e => setCustomPath(e.target.value)}
                placeholder="/absolute/path/to/project"
                className="w-full bg-[#141724] border border-[#222738] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            <button
              onClick={() => setUseCustomPath(!useCustomPath)}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              {useCustomPath ? '← Switch to Fixtures' : 'Enter Custom Local Path →'}
            </button>
          </div>

          <button
            onClick={handleScan}
            disabled={isLoading}
            className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            <span>{isLoading ? 'Scanning...' : 'Scan Repository'}</span>
          </button>
        </div>
      </div>

      {/* Project Diagnostics & Stats */}
      {rawGraph && (
        <div className="p-4 border-b border-[#1c2233] space-y-2 bg-[#0e111b]/50">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Project Overview
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
                <Clock className="w-3 h-3" /> Scan Time
              </div>
              <div className="text-slate-100 font-bold text-sm mt-0.5">
                {scanStats?.durationMs || 0} ms
              </div>
            </div>
          </div>

          {rawGraph.metadata.frameworks.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] text-slate-500 mb-1">Discovered Technologies:</div>
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
      )}

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
