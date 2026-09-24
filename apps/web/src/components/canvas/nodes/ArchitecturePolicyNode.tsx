'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Fingerprint, GitPullRequestArrow, KeyRound } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function ApiOperationNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-sky-500/60"
      glowColor="rgba(14, 165, 233, 0.3)"
      icon={<GitPullRequestArrow className="w-4 h-4 text-sky-400" />}
      title={nodeData.displayName}
      subtitle={`${nodeData.metadata?.provider || 'API'} ${nodeData.metadata?.protocol || 'operation'}`}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/60">REST</span>}
    />
  );
}

export function PermissionScopeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const sufficient = nodeData.metadata?.sufficient !== false;
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor={sufficient ? 'border-amber-500/60' : 'border-red-500/60'}
      glowColor={sufficient ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.3)'}
      icon={<KeyRound className={sufficient ? 'w-4 h-4 text-amber-400' : 'w-4 h-4 text-red-400'} />}
      title={nodeData.displayName}
      subtitle={nodeData.metadata?.appSlug || 'GitHub App permission'}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60">SCOPE</span>}
    />
  );
}

export function IdentityDomainNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-fuchsia-500/60"
      glowColor="rgba(217, 70, 239, 0.25)"
      icon={<Fingerprint className="w-4 h-4 text-fuchsia-400" />}
      title={nodeData.displayName}
      subtitle={nodeData.metadata?.kind?.replace('_', ' ') || 'Identity domain'}
      badge={<span className="px-2 py-0.5 rounded text-[10px] bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-800/60">IDENTITY</span>}
    />
  );
}
