'use client';

import React from 'react';
import { type NodeProps } from '@xyflow/react';
import { Database, Key } from 'lucide-react';
import { BaseNodeContainer } from './BaseNodeContainer';

export function DatabaseModelNode({ id, data, selected }: NodeProps) {
  const nodeData = data as any;
  const fields = (nodeData.metadata?.fields as any[]) || [];

  return (
    <BaseNodeContainer
      id={id}
      selected={selected}
      borderColor="border-cyan-500/30"
      glowColor="rgba(6, 182, 212, 0.25)"
      icon={<Database className="w-4 h-4 text-cyan-400" />}
      title={nodeData.displayName}
      subtitle={`Prisma Model (${fields.length} fields)`}
      badge={
        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
          Table
        </span>
      }
    >
      <div className="space-y-1 mt-1 border-t border-[#1b2032] pt-2">
        {fields.slice(0, 3).map((f: any) => (
          <div key={f.name} className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-mono flex items-center gap-1">
              {f.isId && <Key className="w-2.5 h-2.5 text-amber-400" />}
              {f.name}
            </span>
            <span className="text-slate-500 font-mono text-[10px]">
              {f.type}
              {f.isList ? '[]' : ''}
              {f.isOptional ? '?' : ''}
            </span>
          </div>
        ))}
        {fields.length > 3 && (
          <div className="text-[10px] text-slate-500 italic pt-0.5">
            +{fields.length - 3} more fields
          </div>
        )}
      </div>
    </BaseNodeContainer>
  );
}
