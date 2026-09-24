import React from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  Download,
  AlertTriangle,
  RefreshCw,
  Clock,
  Filter,
  ShieldCheck,
  CloudUpload,
  Share2,
} from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { isCloudEnabled } from '@/lib/cloud';

interface ContextBarProps {
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
  onOpenSaveModal?: () => void;
  onOpenShareModal?: () => void;
}

export function ContextBar({
  onToggleFilters,
  isFilterOpen,
  onOpenSaveModal,
  onOpenShareModal,
}: ContextBarProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const layoutedGraph = useStackfoldStore(s => s.layoutedGraph);
  const activeView = useStackfoldStore(s => s.activeView);
  const scanStats = useStackfoldStore(s => s.scanStats);
  const isLoading = useStackfoldStore(s => s.isLoading);
  const scan = useStackfoldStore(s => s.scan);
  const currentRootPath = useStackfoldStore(s => s.currentRootPath);
  const setAiAssistantOpen = useStackfoldStore(s => s.setAiAssistantOpen);
  const setExportModalOpen = useStackfoldStore(s => s.setExportModalOpen);
  const isDiagnosticsDrawerOpen = useStackfoldStore(s => s.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useStackfoldStore(s => s.setDiagnosticsDrawerOpen);

  const diagnosticsCount = rawGraph?.diagnostics?.length || 0;
  const nodeCount = layoutedGraph?.nodes.length || 0;
  const edgeCount = layoutedGraph?.edges.length || 0;

  const handleRescan = () => {
    if (isLoading) return;
    if (currentRootPath) {
      scan({ rootPath: currentRootPath, useCache: false });
    } else {
      scan({ fixture: 'sample-ecommerce-app', useCache: false });
    }
  };

  const viewTitles = {
    architecture: 'Architecture Overview',
    api_flow: 'API Routes & Endpoints',
    database: 'Database & Prisma Schemas',
    dependencies: 'Packages & Dependencies',
  };

  return (
    <header className="h-14 px-4 bg-[#0d0f0c] border-b border-[#2a2d24] flex items-center justify-between gap-4 select-none shrink-0 z-10">
      {/* Left: View title & Project stats */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xs font-semibold text-[#f6f7f2] truncate">
          {viewTitles[activeView] || 'Architecture Map'}
        </h1>

        {rawGraph && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#a5aa9b]">
            <span>•</span>
            <span className="font-mono text-[11px] text-[#f6f7f2]">
              {nodeCount} nodes
            </span>
            <span className="text-[#74796d]">/</span>
            <span className="font-mono text-[11px] text-[#a5aa9b]">
              {edgeCount} edges
            </span>

            {scanStats?.fromCache && (
              <Badge variant="neutral" size="sm" className="hidden lg:inline-flex">
                Cached
              </Badge>
            )}

            {scanStats && (
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-[#74796d] font-mono">
                <Clock className="w-3 h-3" />
                {scanStats.durationMs}ms
              </span>
            )}

            <span className="hidden 2xl:inline-flex items-center gap-1 text-[11px] text-[#62d49b]">
              <ShieldCheck className="w-3 h-3" />
              Scanned locally
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {rawGraph && (
          <>
            {/* Filter Toggle (especially useful on tablet/compact screens) */}
            {onToggleFilters && (
              <Tooltip content="Toggle Node Filters" side="bottom">
                <Button
                  variant={isFilterOpen ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={onToggleFilters}
                  leftIcon={<Filter className="w-3.5 h-3.5" />}
                  className="xl:hidden"
                >
                  Filters
                </Button>
              </Tooltip>
            )}

            {/* Ask Stackfold AI Assistant */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiAssistantOpen(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#f6c945]" />}
              className="hidden sm:inline-flex border-[#f6c945]/40 text-[#f6f7f2] hover:border-[#f6c945]"
            >
              Ask Stackfold
            </Button>

            {/* Save to Cloud (cloud-only; disabled with explanation in local mode) */}
            {onOpenSaveModal &&
              (isCloudEnabled() ? (
                <Tooltip content="Save Architecture Snapshot to Neon" side="bottom">
                  <button
                    onClick={onOpenSaveModal}
                    aria-label="Save to Cloud"
                    className="p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6c945] transition-colors"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content="Cloud sync disabled — local mode (Clerk not configured)" side="bottom">
                  <button
                    aria-label="Save to Cloud (unavailable in local mode)"
                    aria-disabled="true"
                    className="p-2 rounded-lg bg-[#141611] border border-[#2a2d24] text-[#4f5447] cursor-not-allowed opacity-60"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              ))}

            {/* Share Map (cloud-only; disabled with explanation in local mode) */}
            {onOpenShareModal &&
              (isCloudEnabled() ? (
                <Tooltip content="Share Architecture Map" side="bottom">
                  <button
                    onClick={onOpenShareModal}
                    aria-label="Share Map"
                    className="p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6c945] transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content="Sharing disabled — local mode (Clerk not configured)" side="bottom">
                  <button
                    aria-label="Share Map (unavailable in local mode)"
                    aria-disabled="true"
                    className="p-2 rounded-lg bg-[#141611] border border-[#2a2d24] text-[#4f5447] cursor-not-allowed opacity-60"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              ))}

            {/* Rescan Button */}
            <Tooltip content="Rescan Project" side="bottom">
              <button
                onClick={handleRescan}
                disabled={isLoading}
                aria-label="Rescan Project"
                className="p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6c945] transition-colors disabled:opacity-40"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </button>
            </Tooltip>

            {/* Export Architecture */}
            <Tooltip content="Export Architecture (Mermaid, Markdown, JSON)" side="bottom">
              <button
                onClick={() => setExportModalOpen(true)}
                aria-label="Export Architecture"
                className="p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6c945] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {/* Diagnostics Drawer */}
            <Tooltip content="Scanner Diagnostics" side="bottom">
              <button
                onClick={() => setDiagnosticsDrawerOpen(!isDiagnosticsDrawerOpen)}
                aria-label="Diagnostics Drawer"
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                  diagnosticsCount > 0
                    ? 'bg-[#f6c945]/15 border-[#f6c945]/40 text-[#f6c945] hover:bg-[#f6c945]/25'
                    : 'bg-[#141611] border-[#2a2d24] text-[#a5aa9b] hover:text-[#f6f7f2]'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Diagnostics</span>
                {diagnosticsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#f6c945] text-[#070806] text-[10px] font-bold flex items-center justify-center">
                    {diagnosticsCount}
                  </span>
                )}
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </header>
  );
}
