'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { FileCode, Sparkles } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function ModuleNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const exportsCount = (nodeData.metadata?.exports as string[])?.length || 0;

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-slate-700/50"
      glowColor="rgba(148, 163, 184, 0.2)"
      icon={<FileCode className="w-4 h-4 text-slate-400" />}
      title={nodeData.displayName}
      subtitle={nodeData.filePath}
      badge={
        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
          Module
        </span>
      }
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{exportsCount} exports</span>
        <span>{nodeData.metadata?.functions?.length || 0} functions</span>
      </div>
    </BaseNodeContainer>
  );
}

export function ComponentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const isClient = nodeData.metadata?.isClientComponent;

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-violet-500/30"
      glowColor="rgba(139, 92, 246, 0.25)"
      icon={<Sparkles className="w-4 h-4 text-violet-400" />}
      title={nodeData.displayName}
      subtitle={nodeData.filePath}
      badge={
        <span className="px-2 py-0.5 rounded text-[10px] bg-violet-950/80 text-violet-300 border border-violet-800/60">
          {isClient ? 'Client' : 'Server'}
        </span>
      }
    >
      <div className="text-[11px] text-slate-400">
        {nodeData.metadata?.routePath || 'React Component'}
      </div>
    </BaseNodeContainer>
  );
}
