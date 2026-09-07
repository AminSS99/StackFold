'use client';

import React from 'react';
import { Target, X } from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';

export function FocusBanner() {
  const focusedNodeId = useStackfoldStore(s => s.focusedNodeId);
  const resetFocus = useStackfoldStore(s => s.resetFocus);
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  if (!focusedNodeId || !rawGraph) return null;

  const targetNode = rawGraph.nodes.find(n => n.id === focusedNodeId);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 select-none animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121522]/95 border border-indigo-500/50 shadow-2xl backdrop-blur-md text-xs">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-slate-400">Isolated Subgraph:</span>
          <span className="font-bold text-slate-100 font-mono">
            {targetNode?.displayName || focusedNodeId}
          </span>
        </div>
        <div className="h-3.5 w-px bg-[#262f48]" />
        <button
          onClick={resetFocus}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          <span>Reset Focus</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
