'use client';

import React, { useMemo } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Target } from 'lucide-react';
import { clsx } from 'clsx';
import type { GraphNode } from '@stackfold/graph';
import { calculateChangeImpact } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';

interface ImpactTabProps {
  node: GraphNode;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'Critical Blast Radius',
    color: 'text-rose-400',
    bg: 'bg-rose-950/60',
    border: 'border-rose-800/80',
    icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
  },
  HIGH: {
    label: 'High Impact Radius',
    color: 'text-orange-400',
    bg: 'bg-orange-950/60',
    border: 'border-orange-800/80',
    icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
  },
  MEDIUM: {
    label: 'Medium Impact',
    color: 'text-amber-400',
    bg: 'bg-amber-950/60',
    border: 'border-amber-800/80',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  },
  LOW: {
    label: 'Low / Isolated Impact',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-800/80',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  },
};

export function ImpactTab({ node }: ImpactTabProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const focusSubgraph = useStackfoldStore(s => s.focusSubgraph);
  const focusedNodeId = useStackfoldStore(s => s.focusedNodeId);
  const resetFocus = useStackfoldStore(s => s.resetFocus);

  const impact = useMemo(() => {
    if (!rawGraph) return null;
    return calculateChangeImpact(rawGraph, node.id);
  }, [rawGraph, node.id]);

  if (!impact) {
    return <div className="text-xs text-slate-500 italic">Computing impact...</div>;
  }

  const isCurrentlyFocused = focusedNodeId === node.id;
  const sevConfig = SEVERITY_CONFIG[impact.severity] || SEVERITY_CONFIG.LOW;

  return (
    <div className="space-y-4 text-xs">
      {/* Isolate Blast Radius */}
      <button
        onClick={() => (isCurrentlyFocused ? resetFocus() : focusSubgraph(node.id))}
        className="w-full py-2 px-3 bg-[#181d2f] hover:bg-[#22293e] border border-[#2d354e] rounded-xl text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors text-xs shadow-sm"
      >
        <Target className="w-3.5 h-3.5 text-rose-400" />
        <span>{isCurrentlyFocused ? 'Reset Focus (Show All)' : 'Isolate Blast Radius on Canvas'}</span>
      </button>

      {/* Blast Radius Score Card */}
      <div className={clsx('p-3 rounded-xl border space-y-2', sevConfig.bg, sevConfig.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            {sevConfig.icon}
            <span className={sevConfig.color}>{sevConfig.label}</span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 text-slate-200">
            {impact.totalAffectedNodes} affected nodes
          </span>
        </div>
        <p className="text-[11px] text-slate-300">
          Modifying <span className="font-semibold text-white">{node.displayName}</span> will propagate changes across direct and transitive dependencies.
        </p>
      </div>

      {/* Affected API Routes */}
      {impact.affectedApiRoutes.length > 0 && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Affected API Endpoints ({impact.affectedApiRoutes.length})</span>
            <span className="text-[10px] text-emerald-400 font-mono">Public Routes</span>
          </div>
          <div className="space-y-1">
            {impact.affectedApiRoutes.map(route => (
              <button
                key={route.id}
                onClick={() => selectNode(route.id)}
                className="w-full p-2 rounded bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
              >
                <span className="font-mono font-medium text-slate-200">{route.displayName}</span>
                <span className="text-[10px] text-slate-400">Depth {route.depth}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Affected Database Models */}
      {impact.affectedDatabaseModels.length > 0 && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Affected Database Models ({impact.affectedDatabaseModels.length})</span>
            <span className="text-[10px] text-cyan-400 font-mono">Schema</span>
          </div>
          <div className="space-y-1">
            {impact.affectedDatabaseModels.map(model => (
              <button
                key={model.id}
                onClick={() => selectNode(model.id)}
                className="w-full p-2 rounded bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
              >
                <span className="font-mono font-medium text-slate-200">{model.displayName}</span>
                <span className="text-[10px] text-slate-400">Depth {model.depth}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direct Dependents */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="text-[11px] text-slate-400 font-medium">
          Direct Dependents (Depth 1: {impact.directDependents.length})
        </div>
        {impact.directDependents.length === 0 ? (
          <div className="text-slate-500 italic text-[11px]">No direct dependents found.</div>
        ) : (
          <div className="space-y-1">
            {impact.directDependents.map(dep => (
              <button
                key={dep.id}
                onClick={() => selectNode(dep.id)}
                className="w-full p-2 rounded bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">{dep.displayName}</div>
                  <div className="text-[10px] text-slate-400">{dep.reason}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transitive Dependents */}
      {impact.transitiveDependents.length > 0 && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium">
            Transitive Dependents (Depth &gt; 1: {impact.transitiveDependents.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {impact.transitiveDependents.map(dep => (
              <button
                key={dep.id}
                onClick={() => selectNode(dep.id)}
                className="w-full p-2 rounded bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">{dep.displayName}</div>
                  <div className="text-[10px] text-slate-400">{dep.reason}</div>
                </div>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1c2233] text-indigo-300">
                  depth {dep.depth}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
