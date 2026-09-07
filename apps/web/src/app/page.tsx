'use client';

import React, { useEffect } from 'react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { TopBar } from '@/components/navigation/TopBar';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';
import { Canvas } from '@/components/canvas/Canvas';
import { Inspector } from '@/components/inspector/Inspector';
import { CommandPalette } from '@/components/search/CommandPalette';
import { DiagnosticsDrawer } from '@/components/diagnostics/DiagnosticsDrawer';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
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
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input or textarea
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
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        setDiagnosticsDrawerOpen(!isDiagnosticsDrawerOpen);
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
    selectNode,
    resetFocus,
    setActiveView,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090a0f] text-slate-100 overflow-hidden select-none">
      {/* Top Navigation */}
      <TopBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Only visible when project is loaded) */}
        <ProjectSidebar />

        {/* Center Canvas */}
        <main className="flex-1 h-full relative overflow-hidden">
          <Canvas />
        </main>

        {/* Right Inspector Panel */}
        <Inspector />
      </div>

      {/* Overlays & Modals */}
      <CommandPalette />
      <DiagnosticsDrawer />
      <OnboardingModal />
    </div>
  );
}
