'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { ShieldAlert } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function RiskBoundaryNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const severity = String(nodeData.metadata?.severity || 'high').toUpperCase();
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-red-500/60"
      glowColor="rgba(239, 68, 68, 0.3)"
      icon={<ShieldAlert className="w-4 h-4 text-red-400" />}
      title={nodeData.displayName}
      subtitle={nodeData.metadata?.ruleId || 'Architecture guardrail'}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-300 border border-red-800/60">{severity}</span>}
    />
  );
}
