'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Cloud, CreditCard, Mail, Sparkles, Server } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  Stripe: <CreditCard className="w-4 h-4 text-emerald-400" />,
  Resend: <Mail className="w-4 h-4 text-indigo-400" />,
  OpenAI: <Sparkles className="w-4 h-4 text-teal-400" />,
  Supabase: <Server className="w-4 h-4 text-emerald-400" />,
};

export function ServiceNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const icon = SERVICE_ICONS[nodeData.displayName] || <Cloud className="w-4 h-4 text-sky-400" />;

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-sky-500/30"
      glowColor="rgba(56, 189, 248, 0.25)"
      icon={icon}
      title={nodeData.displayName}
      subtitle={nodeData.metadata?.category || 'Cloud Service'}
      badge={
        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/60">
          SDK
        </span>
      }
    >
      <div className="text-[11px] text-slate-400 line-clamp-2">
        {nodeData.metadata?.description || 'External third-party integration'}
      </div>
    </BaseNodeContainer>
  );
}
