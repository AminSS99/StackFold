import React from 'react';
import { clsx } from 'clsx';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRightLeft,
  ArrowUpDown,
  List,
  HelpCircle,
  Map,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { DensityLevel } from '@stackfold/graph';
import { Tooltip } from '@/components/ui/Tooltip';

interface CanvasDockProps {
  onToggleLegend: () => void;
  isLegendOpen: boolean;
  onToggleNodeList: () => void;
  onToggleMinimap: () => void;
  isMinimapOpen: boolean;
}

export function CanvasDock({
  onToggleLegend,
  isLegendOpen,
  onToggleNodeList,
  onToggleMinimap,
  isMinimapOpen,
}: CanvasDockProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const density = useStackfoldStore(s => s.density);
  const setDensity = useStackfoldStore(s => s.setDensity);
  const layoutDirection = useStackfoldStore(s => s.layoutDirection);
  const setLayoutDirection = useStackfoldStore(s => s.setLayoutDirection);

  const toggleLayoutDirection = () => {
    setLayoutDirection(layoutDirection === 'LR' ? 'TB' : 'LR');
  };

  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1 bg-[#0d0f0c]/90 backdrop-blur-md rounded-lg border border-[#2a2d24] shadow-2xl select-none">
      {/* Zoom controls */}
      <Tooltip content="Zoom In" side="top">
        <button
          onClick={() => zoomIn({ duration: 250 })}
          aria-label="Zoom In"
          className="p-1.5 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Zoom Out" side="top">
        <button
          onClick={() => zoomOut({ duration: 250 })}
          aria-label="Zoom Out"
          className="p-1.5 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Fit to Canvas" side="top">
        <button
          onClick={() => fitView({ padding: 0.15, duration: 300 })}
          aria-label="Fit View"
          className="p-1.5 rounded text-[#a5aa9b] hover:text-[#f6c945] hover:bg-[#141611] transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </Tooltip>

      <div className="h-4 w-px bg-[#2a2d24] mx-0.5" />

      {/* Density level selector */}
      <div className="flex items-center bg-[#141611] p-0.5 rounded border border-[#2a2d24]">
        {(['overview', 'standard', 'detailed'] as DensityLevel[]).map(d => (
          <button
            key={d}
            onClick={() => setDensity(d)}
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] capitalize font-medium transition-colors',
              density === d
                ? 'bg-[#f6c945] text-[#070806] font-bold'
                : 'text-[#a5aa9b] hover:text-[#f6f7f2]'
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[#2a2d24] mx-0.5" />

      {/* Layout direction toggle */}
      <Tooltip
        content={`Switch layout to ${layoutDirection === 'LR' ? 'Vertical (TB)' : 'Horizontal (LR)'}`}
        side="top"
      >
        <button
          onClick={toggleLayoutDirection}
          aria-label="Toggle Layout Direction"
          className="p-1.5 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] transition-colors"
        >
          {layoutDirection === 'LR' ? (
            <ArrowRightLeft className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </button>
      </Tooltip>

      {/* Minimap toggle */}
      <Tooltip content="Toggle Minimap" side="top">
        <button
          onClick={onToggleMinimap}
          aria-label="Toggle Minimap"
          className={clsx(
            'p-1.5 rounded transition-colors',
            isMinimapOpen
              ? 'bg-[#1b1e17] text-[#f6c945]'
              : 'text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611]'
          )}
        >
          <Map className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Accessible Node List modal */}
      <Tooltip content="Searchable Node Table" side="top">
        <button
          onClick={onToggleNodeList}
          aria-label="View Node List"
          className="p-1.5 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611] transition-colors"
        >
          <List className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Legend toggle */}
      <Tooltip content="Graph Taxonomy Legend" side="top">
        <button
          onClick={onToggleLegend}
          aria-label="Toggle Legend"
          className={clsx(
            'p-1.5 rounded transition-colors',
            isLegendOpen
              ? 'bg-[#1b1e17] text-[#f6c945]'
              : 'text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#141611]'
          )}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}
