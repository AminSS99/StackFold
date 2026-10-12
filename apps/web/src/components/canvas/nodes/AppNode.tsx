'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Layers, Box } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function AppNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const isApp = nodeData.type === 'application';

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor={isApp ? 'border-violet-500/30' : 'border-[#45493d]'}
      glowColor="rgba(246, 201, 69, 0.22)"
      icon={isApp ? <Layers className="w-4 h-4 text-violet-400" /> : <Box className="w-4 h-4 text-slate-400" />}
      title={nodeData.displayName}
      subtitle={nodeData.filePath}
      badge={
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-950/60 text-violet-300 border border-violet-800/50">
          {isApp ? 'App' : 'Package'}
        </span>
      }
    >
      <div className="flex flex-wrap gap-1 mt-1">
        {nodeData.metadata?.scripts && Array.isArray(nodeData.metadata.scripts) && (
          <div className="text-[10px] text-slate-400">
            {nodeData.metadata.scripts.length} scripts
          </div>
        )}
        {nodeData.tags && Array.isArray(nodeData.tags) && (
          nodeData.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-[#202319] text-slate-300 text-[10px]">
              {tag}
            </span>
          ))
        )}
      </div>
    </BaseNodeContainer>
  );
}
