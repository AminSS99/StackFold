'use client';

import React, { useMemo } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Target } from 'lucide-react';
import { clsx } from 'clsx';
import type { GraphNode } from '@stackfold/graph';
import { calculateChangeImpact } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { Badge } from '@/components/ui/Badge';

interface ImpactTabProps {
  node: GraphNode;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'Critical Blast Radius',
    color: 'text-[#ff6b6b]',
    bg: 'bg-[#ff6b6b]/10',
    border: 'border-[#ff6b6b]/40',
    icon: <AlertOctagon className="w-4 h-4 text-[#ff6b6b]" />,
  },
  HIGH: {
    label: 'High Impact Radius',
    color: 'text-[#f6c945]',
    bg: 'bg-[#f6c945]/10',
    border: 'border-[#f6c945]/40',
    icon: <ShieldAlert className="w-4 h-4 text-[#f6c945]" />,
  },
  MEDIUM: {
    label: 'Medium Impact',
    color: 'text-[#f6c945]',
    bg: 'bg-[#f6c945]/10',
    border: 'border-[#f6c945]/30',
    icon: <AlertTriangle className="w-4 h-4 text-[#f6c945]" />,
  },
  LOW: {
    label: 'Low / Isolated Impact',
    color: 'text-[#62d49b]',
    bg: 'bg-[#62d49b]/10',
    border: 'border-[#62d49b]/30',
    icon: <CheckCircle2 className="w-4 h-4 text-[#62d49b]" />,
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
    return <div className="text-xs text-[#74796d] italic">Computing impact...</div>;
  }

  const isCurrentlyFocused = focusedNodeId === node.id;
  const sevConfig = SEVERITY_CONFIG[impact.severity] || SEVERITY_CONFIG.LOW;

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Isolate Blast Radius */}
      <button
        onClick={() => (isCurrentlyFocused ? resetFocus() : focusSubgraph(node.id))}
        className="w-full py-2 px-3 bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] hover:border-[#3b3f31] rounded-lg text-[#f6f7f2] font-medium flex items-center justify-center gap-2 transition-colors text-xs shadow-sm"
      >
        <Target className="w-3.5 h-3.5 text-[#ff6b6b]" />
        <span>{isCurrentlyFocused ? 'Reset Focus (Show All)' : 'Isolate Blast Radius on Canvas'}</span>
      </button>

      {/* Blast Radius Score Card */}
      <div className={clsx('p-3 rounded-lg border space-y-2', sevConfig.bg, sevConfig.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            {sevConfig.icon}
            <span className={sevConfig.color}>{sevConfig.label}</span>
          </div>
          <Badge variant="neutral" size="sm">
            {impact.totalAffectedNodes} affected nodes
          </Badge>
        </div>
        <p className="text-[11px] text-[#a5aa9b] leading-relaxed">
          Modifying <span className="font-semibold text-[#f6f7f2]">{node.displayName}</span> will propagate changes across direct and transitive dependencies.
        </p>
      </div>

      {/* Affected API Routes */}
      {impact.affectedApiRoutes.length > 0 && (
        <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
          <div className="text-[11px] text-[#a5aa9b] font-medium flex items-center justify-between">
            <span>Affected API Endpoints ({impact.affectedApiRoutes.length})</span>
            <span className="text-[10px] text-[#62d49b] font-mono">Public Routes</span>
          </div>
          <div className="space-y-1">
            {impact.affectedApiRoutes.map(route => (
              <button
                key={route.id}
                onClick={() => selectNode(route.id)}
                className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
              >
                <span className="font-mono font-medium text-[#f6f7f2]">{route.displayName}</span>
                <span className="text-[10px] text-[#74796d]">Depth {route.depth}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Affected Database Models */}
      {impact.affectedDatabaseModels.length > 0 && (
        <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
          <div className="text-[11px] text-[#a5aa9b] font-medium flex items-center justify-between">
            <span>Affected Database Models ({impact.affectedDatabaseModels.length})</span>
            <span className="text-[10px] text-cyan-400 font-mono">Schema</span>
          </div>
          <div className="space-y-1">
            {impact.affectedDatabaseModels.map(model => (
              <button
                key={model.id}
                onClick={() => selectNode(model.id)}
                className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
              >
                <span className="font-mono font-medium text-[#f6f7f2]">{model.displayName}</span>
                <span className="text-[10px] text-[#74796d]">Depth {model.depth}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direct Dependents */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="text-[11px] text-[#a5aa9b] font-medium">
          Direct Dependents (Depth 1: {impact.directDependents.length})
        </div>
        {impact.directDependents.length === 0 ? (
          <div className="text-[#74796d] italic text-[11px]">No direct dependents found.</div>
        ) : (
          <div className="space-y-1">
            {impact.directDependents.map(dep => (
              <button
                key={dep.id}
                onClick={() => selectNode(dep.id)}
                className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[#f6f7f2] truncate">{dep.displayName}</div>
                  <div className="text-[10px] text-[#74796d]">{dep.reason}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#74796d] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transitive Dependents */}
      {impact.transitiveDependents.length > 0 && (
        <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
          <div className="text-[11px] text-[#a5aa9b] font-medium">
            Transitive Dependents (Depth &gt; 1: {impact.transitiveDependents.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {impact.transitiveDependents.map(dep => (
              <button
                key={dep.id}
                onClick={() => selectNode(dep.id)}
                className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[#f6f7f2] truncate">{dep.displayName}</div>
                  <div className="text-[10px] text-[#74796d]">{dep.reason}</div>
                </div>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1b1e17] text-[#f6c945] border border-[#2a2d24]">
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
