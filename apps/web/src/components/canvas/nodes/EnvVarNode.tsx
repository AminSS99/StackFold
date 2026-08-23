'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function EnvVarNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const isDeclared = nodeData.metadata?.isDeclaredInExample;
  const usageCount = nodeData.metadata?.usageCount || 0;

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor={isDeclared ? 'border-amber-500/30' : 'border-rose-500/40'}
      glowColor="rgba(245, 158, 11, 0.25)"
      icon={<KeyRound className="w-4 h-4 text-amber-400" />}
      title={nodeData.displayName}
      subtitle={`${usageCount} usage locations`}
      badge={
        isDeclared ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Config
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60">
            <AlertTriangle className="w-2.5 h-2.5" />
            Undeclared
          </span>
        )
      }
    >
      <div className="text-[11px] text-slate-400 font-mono">
        Zero secret leakage guarantee
      </div>
    </BaseNodeContainer>
  );
}
