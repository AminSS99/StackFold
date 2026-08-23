'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';

interface BaseNodeContainerProps {
  id: string;
  selected?: boolean;
  borderColor?: string;
  glowColor?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

export function BaseNodeContainer({
  id,
  selected,
  borderColor = 'border-[#2a3147]',
  glowColor = 'rgba(99, 102, 241, 0.25)',
  icon,
  title,
  subtitle,
  badge,
  children,
}: BaseNodeContainerProps) {
  const selectedNodeId = useStackfoldStore(s => s.selectedNodeId);
  const isCurrentlySelected = selected || selectedNodeId === id;

  return (
    <div
      className={clsx(
        'relative rounded-xl bg-[#111420] border transition-all duration-200 shadow-lg select-none min-w-[200px] text-xs',
        isCurrentlySelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-500/20'
          : `${borderColor} hover:border-[#434d70]`
      )}
      style={{
        boxShadow: isCurrentlySelected ? `0 0 20px ${glowColor}` : undefined,
      }}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-[#111420] !-left-[5px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-[#111420] !-right-[5px]"
      />

      {/* Header */}
      <div className="p-3 border-b border-[#1b2032] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
          <div className="min-w-0">
            <div className="font-semibold text-slate-100 truncate text-[13px]">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-400 truncate">{subtitle}</div>}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Body */}
      {children && <div className="p-3">{children}</div>}
    </div>
  );
}
