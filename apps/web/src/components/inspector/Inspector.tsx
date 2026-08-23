'use client';

import React from 'react';
import { X, Info, Activity, SearchCheck, Sparkles, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { DetailsTab } from './DetailsTab';
import { ImpactTab } from './ImpactTab';
import { EvidenceTab } from './EvidenceTab';
import { AiTab } from './AiTab';

const TABS = [
  { id: 'details', label: 'Details', icon: <Info className="w-3.5 h-3.5" /> },
  { id: 'impact', label: 'Impact', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'evidence', label: 'Evidence', icon: <SearchCheck className="w-3.5 h-3.5" /> },
  { id: 'ai', label: 'AI Insights', icon: <Sparkles className="w-3.5 h-3.5" /> },
] as const;

export function Inspector() {
  const selectedNode = useStackfoldStore(s => s.selectedNode);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const activeInspectorTab = useStackfoldStore(s => s.activeInspectorTab);
  const setActiveInspectorTab = useStackfoldStore(s => s.setActiveInspectorTab);

  if (!selectedNode) {
    return null;
  }

  const incomingEdges = rawGraph?.edges.filter(e => e.target === selectedNode.id) || [];
  const outgoingEdges = rawGraph?.edges.filter(e => e.source === selectedNode.id) || [];

  return (
    <aside className="w-96 bg-[#0c0e16] border-l border-[#1c2233] flex flex-col h-full z-20 shadow-2xl select-none">
      {/* Inspector Header */}
      <div className="p-4 border-b border-[#1c2233] flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
              {selectedNode.type}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-100 truncate">{selectedNode.displayName}</h2>
          {selectedNode.filePath && (
            <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {selectedNode.filePath}
            </div>
          )}
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1c2233] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#1c2233] px-2 bg-[#0e111b]">
        {TABS.map(tab => {
          const isActive = activeInspectorTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveInspectorTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex-1 justify-center',
                isActive
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeInspectorTab === 'details' && (
          <DetailsTab
            node={selectedNode}
            incomingEdges={incomingEdges}
            outgoingEdges={outgoingEdges}
          />
        )}
        {activeInspectorTab === 'impact' && <ImpactTab node={selectedNode} />}
        {activeInspectorTab === 'evidence' && <EvidenceTab node={selectedNode} />}
        {activeInspectorTab === 'ai' && (
          <AiTab
            node={selectedNode}
            incomingEdges={incomingEdges}
            outgoingEdges={outgoingEdges}
          />
        )}
      </div>
    </aside>
  );
}
