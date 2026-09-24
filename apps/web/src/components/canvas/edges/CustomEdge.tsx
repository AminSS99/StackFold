'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';

const EDGE_COLORS: Record<string, string> = {
  exposes: '#f6c945', // Signal yellow
  reads: '#38bdf8', // Sky
  writes: '#f43f5e', // Rose
  communicates_with: '#34d399', // Emerald
  configured_by: '#fbbf24', // Amber
  imports: '#64748b', // Slate
  depends_on: '#a855f7', // Purple
  contains: '#475569', // Dark Slate
  binds_to: '#fb7185', // Risk boundary
  may_impact: '#f97316', // Upstream drift
  violates: '#ef4444', // Guardrail violation
  traces_to: '#f87171', // Evidence trace
  requires: '#0ea5e9', // Required provider capability
  declares: '#f59e0b', // Declared configuration
  crosses: '#d946ef', // Identity-domain crossing
  warms: '#60a5fa', // Session warming a cache
  serves: '#a78bfa', // Cache serving a second session
  exposes_private_data: '#ef4444', // Confirmed cross-session leak
};

export function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const selectedNodeId = useStackfoldStore(s => s.selectedNodeId);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const edgeType = (data?.type as string) || 'imports';
  const color = EDGE_COLORS[edgeType] || '#a5aa9b';

  const isConnectedToSelection =
    selectedNodeId && (source === selectedNodeId || target === selectedNodeId);

  const isHighlighted = selected || isConnectedToSelection;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={22}
        style={{
          stroke: isHighlighted ? '#f6c945' : color,
          strokeWidth: isHighlighted ? 2.5 : 1.5,
          opacity: selectedNodeId ? (isConnectedToSelection ? 1 : 0.25) : 0.8,
          transition: 'all 0.2s ease',
        }}
      />
      {isHighlighted && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-[#11130f] border border-[#5b604f] text-[#f6c945] shadow-md select-none"
          >
            {edgeType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
