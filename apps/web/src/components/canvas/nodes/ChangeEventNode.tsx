'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { GitCompareArrows } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function ChangeEventNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-orange-500/40"
      glowColor="rgba(249, 115, 22, 0.24)"
      icon={<GitCompareArrows className="w-4 h-4 text-orange-400" />}
      title={nodeData.displayName}
      subtitle={`${nodeData.metadata?.sourceName || 'Upstream change'}${nodeData.metadata?.sourceVersion ? ` ${nodeData.metadata.sourceVersion}` : ''}`}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-orange-950/80 text-orange-300 border border-orange-800/60">DRIFT</span>}
    />
  );
}
