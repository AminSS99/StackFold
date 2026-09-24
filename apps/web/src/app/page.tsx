'use client';

import React, { useEffect, useState } from 'react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { AppRail } from '@/components/shell/AppRail';
import { ContextBar } from '@/components/shell/ContextBar';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';
import { Canvas } from '@/components/canvas/Canvas';
import { Inspector } from '@/components/inspector/Inspector';
import { CommandPalette } from '@/components/search/CommandPalette';
import { DiagnosticsDrawer } from '@/components/diagnostics/DiagnosticsDrawer';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { ExportModal } from '@/components/export/ExportModal';
import { ArchitectureAssistantModal } from '@/components/ai/ArchitectureAssistantModal';
import { SaveProjectModal } from '@/components/cloud/SaveProjectModal';
import { ShareModal } from '@/components/cloud/ShareModal';
import type { GraphViewType } from '@stackfold/graph';

const VIEW_MAP: Record<string, GraphViewType> = {
  '1': 'architecture',
  '2': 'api_flow',
  '3': 'database',
  '4': 'dependencies',
};

export default function StackfoldPage() {
  const loadRecentProjects = useStackfoldStore(s => s.loadRecentProjects);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const resetFocus = useStackfoldStore(s => s.resetFocus);
  const setActiveView = useStackfoldStore(s => s.setActiveView);
  const isDiagnosticsDrawerOpen = useStackfoldStore(s => s.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useStackfoldStore(s => s.setDiagnosticsDrawerOpen);
  const isCommandPaletteOpen = useStackfoldStore(s => s.isCommandPaletteOpen);
  const setCommandPaletteOpen = useStackfoldStore(s => s.setCommandPaletteOpen);
  const isExportModalOpen = useStackfoldStore(s => s.isExportModalOpen);
  const setExportModalOpen = useStackfoldStore(s => s.setExportModalOpen);
  const isAiAssistantOpen = useStackfoldStore(s => s.isAiAssistantOpen);
  const setAiAssistantOpen = useStackfoldStore(s => s.setAiAssistantOpen);
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lastSavedSnapshotId, setLastSavedSnapshotId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  // Set default filter open state based on screen width
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsFilterOpen(window.innerWidth >= 1280);
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input, textarea, or select
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        selectNode(null);
        resetFocus();
        setDiagnosticsDrawerOpen(false);
        setCommandPaletteOpen(false);
        setExportModalOpen(false);
        setAiAssistantOpen(false);
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        setDiagnosticsDrawerOpen(!isDiagnosticsDrawerOpen);
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        setIsFilterOpen(prev => !prev);
        return;
      }

      if (rawGraph && VIEW_MAP[e.key]) {
        setActiveView(VIEW_MAP[e.key]!);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    rawGraph,
    isDiagnosticsDrawerOpen,
    setDiagnosticsDrawerOpen,
    setCommandPaletteOpen,
    setExportModalOpen,
    setAiAssistantOpen,
    selectNode,
    resetFocus,
    setActiveView,
  ]);

  return (
    <div className="flex h-[100dvh] w-screen bg-[#070806] text-[#f6f7f2] overflow-hidden">
      {/* Left App Rail */}
      <AppRail />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Context Bar */}
        <ContextBar
          isFilterOpen={isFilterOpen}
          onToggleFilters={() => setIsFilterOpen(prev => !prev)}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        {/* Workspace Canvas + Panels */}
        <div className="flex-1 flex overflow-hidden relative min-h-0">
          {/* Collapsible Filter Panel */}
          {rawGraph && (
            <ProjectSidebar
              className={
                isFilterOpen
                  ? 'absolute inset-y-0 left-0 z-20 shadow-2xl xl:static xl:shadow-none'
                  : 'hidden'
              }
            />
          )}

          {/* Center Graph Canvas & Adaptive Inspector */}
          <main className="flex-1 h-full min-w-0 relative overflow-hidden sf-grid">
            <Canvas />
            <Inspector />
          </main>
        </div>
      </div>

      {/* Global Overlays & Modals */}
      <CommandPalette />
      <DiagnosticsDrawer />
      <OnboardingModal />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} />
      <ArchitectureAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaved={(_projId, snapId) => {
          setLastSavedSnapshotId(snapId);
        }}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        snapshotId={lastSavedSnapshotId}
        onNeedSaveFirst={() => {
          setIsSaveModalOpen(true);
        }}
      />
    </div>
  );
}
