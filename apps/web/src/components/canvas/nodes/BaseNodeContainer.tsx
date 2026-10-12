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
  borderColor = 'border-[#34382e]',
  glowColor = 'rgba(246, 201, 69, 0.22)',
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
        'relative w-full min-w-0 rounded-[10px] border bg-[#11130f] text-xs shadow-lg transition-[border-color,box-shadow,transform] duration-200 select-none hover:-translate-y-px',
        isCurrentlySelected
          ? 'border-[#f6c945] ring-2 ring-[#f6c945]/30 shadow-[#f6c945]/10'
          : `${borderColor} hover:border-[#606554]`
      )}
      style={{
        boxShadow: isCurrentlySelected ? `0 0 20px ${glowColor}` : undefined,
      }}
    >
      {isCurrentlySelected && <span className="absolute -left-1 top-3 h-8 w-0.5 rounded-full bg-[#f6c945]" aria-hidden="true" />}
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#f6c945] !border-2 !border-[#11130f] !-left-[5px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#f6c945] !border-2 !border-[#11130f] !-right-[5px]"
      />

      {/* Header */}
      <div className="p-3 border-b border-[#292c24] flex items-center justify-between gap-2">
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
