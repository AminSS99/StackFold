'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Globe, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { BaseNodeContainer } from './BaseNodeContainer';

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-blue-950/80', text: 'text-blue-300', border: 'border-blue-700/60' },
  POST: { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-700/60' },
  PUT: { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-700/60' },
  PATCH: { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-700/60' },
  DELETE: { bg: 'bg-rose-950/80', text: 'text-rose-300', border: 'border-rose-700/60' },
};

export function ApiRouteNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const method = (nodeData.metadata?.httpMethod as string) || 'GET';
  const colors = METHOD_COLORS[method] || {
    bg: 'bg-slate-800',
    text: 'text-slate-200',
    border: 'border-slate-700',
  };

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-emerald-500/30"
      glowColor="rgba(16, 185, 129, 0.25)"
      icon={<Globe className="w-4 h-4 text-emerald-400" />}
      title={nodeData.metadata?.routePath || nodeData.displayName}
      subtitle={nodeData.filePath}
      badge={
        <span
          className={clsx(
            'px-2 py-0.5 rounded font-mono text-[10px] font-bold border',
            colors.bg,
            colors.text,
            colors.border
          )}
        >
          {method}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>App Router</span>
        </div>
        {nodeData.metadata?.isDynamic && (
          <span className="px-1.5 py-0.2 rounded bg-[#1e2337] text-amber-300 text-[9px] font-mono">
            dynamic
          </span>
        )}
      </div>
    </BaseNodeContainer>
  );
}
