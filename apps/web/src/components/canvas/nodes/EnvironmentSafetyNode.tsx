'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { CloudCog, Database, TriangleAlert } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function DeploymentEnvironmentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const kind = nodeData.metadata?.environmentKind || 'environment';
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-violet-500/30"
      glowColor="rgba(139, 92, 246, 0.25)"
      icon={<CloudCog className="w-4 h-4 text-violet-400" />}
      title={nodeData.displayName}
      subtitle={`${nodeData.metadata?.provider || 'Deployment'} environment`}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-violet-950/80 text-violet-300 border border-violet-800/60 uppercase">{kind}</span>}
    />
  );
}

export function CloudResourceNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const findingCount = Number(nodeData.metadata?.findingCount || 0);
  const risky = findingCount > 0 || nodeData.tags?.includes('risk');
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor={risky ? 'border-rose-500/60' : 'border-emerald-500/30'}
      glowColor={risky ? 'rgba(244, 63, 94, 0.28)' : 'rgba(52, 211, 153, 0.22)'}
      icon={risky ? <TriangleAlert className="w-4 h-4 text-rose-400" /> : <Database className="w-4 h-4 text-emerald-400" />}
      title={nodeData.displayName}
      subtitle={`${nodeData.metadata?.provider || 'Cloud'} ${nodeData.metadata?.resourceType || 'resource'}`}
      badge={
        <span className={`px-2 py-0.5 rounded text-[10px] border ${risky ? 'bg-rose-950/80 text-rose-300 border-rose-800/60' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'}`}>
          {risky ? `${findingCount} RISK` : 'ISOLATED'}
        </span>
      }
    />
  );
}
