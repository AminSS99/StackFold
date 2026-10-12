'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Activity, ServerCog, UserRound } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function BrowserSessionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const isA = nodeData.metadata?.role === 'cache-warmer';
  return <BaseNodeContainer id={id} selected={selected} borderColor={isA ? 'border-blue-500/60' : 'border-violet-500/60'} glowColor={isA ? 'rgba(59,130,246,.25)' : 'rgba(139,92,246,.25)'} icon={<UserRound className={isA ? 'w-4 h-4 text-blue-400' : 'w-4 h-4 text-violet-400'} />} title={nodeData.displayName} subtitle={nodeData.metadata?.role?.replace('-', ' ') || 'Isolated browser context'} badge={<span className="px-2 py-0.5 rounded text-[10px] bg-[#1b1e17] text-[#d9ddd0] border border-[#3b3f31]">SESSION</span>} />;
}

export function SecurityProbeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const leak = nodeData.metadata?.status === 'leak';
  return <BaseNodeContainer id={id} selected={selected} borderColor={leak ? 'border-red-500/60' : 'border-emerald-500/60'} glowColor={leak ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.22)'} icon={<Activity className={leak ? 'w-4 h-4 text-red-400' : 'w-4 h-4 text-emerald-400'} />} title={nodeData.displayName} subtitle={nodeData.metadata?.path || 'Security probe'} badge={<span className={leak ? 'px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-300 border border-red-800/60' : 'px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'}>{leak ? 'LEAK' : 'PASS'}</span>} />;
}

export function CacheLayerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const leak = nodeData.tags?.includes('leak');
  return <BaseNodeContainer id={id} selected={selected} borderColor={leak ? 'border-red-500/60' : 'border-yellow-500/60'} glowColor={leak ? 'rgba(239,68,68,.3)' : 'rgba(246,201,69,.22)'} icon={<ServerCog className={leak ? 'w-4 h-4 text-red-400' : 'w-4 h-4 text-[#f6c945]'} />} title={nodeData.displayName} subtitle={`${nodeData.metadata?.cacheStatusA || '—'} → ${nodeData.metadata?.cacheStatusB || '—'}`} badge={<span className="px-2 py-0.5 rounded text-[10px] bg-yellow-950/70 text-yellow-300 border border-yellow-800/50">CACHE</span>} />;
}
