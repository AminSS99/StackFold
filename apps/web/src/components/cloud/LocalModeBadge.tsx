'use client';

import React from 'react';
import { HardDrive } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { IS_STATIC_DEMO } from '@/lib/demo';

// Clear local-mode state shown wherever cloud-only controls are hidden:
// scanning, fixtures, graph, Security Lab, and exports stay fully functional.
export function LocalModeBadge({ compact = false }: { compact?: boolean }) {
  const label = IS_STATIC_DEMO ? 'Hosted demo · pre-scanned' : 'Local mode · no cloud';
  const body = (
    <div className="flex items-center gap-2 rounded-lg border border-[#2a2d24] bg-[#141611] px-2 py-1.5 text-[10px] text-[#a5aa9b]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#62d49b]" aria-label="Local mode active" />
      <HardDrive className="h-3.5 w-3.5 shrink-0 text-[#62d49b]" />
      {!compact && <span className="hidden truncate md:inline">{label}</span>}
    </div>
  );
  return (
    <Tooltip content={IS_STATIC_DEMO ? "Hosted demo: projects were scanned in advance with the real scanner. Nothing you do here leaves your browser. Install the app or CLI to scan your own repository." : "Local-first: scans run on your machine. Cloud sync is disabled without Clerk configuration."} side="right">
      {body}
    </Tooltip>
  );
}
