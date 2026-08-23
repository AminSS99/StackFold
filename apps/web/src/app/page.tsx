'use client';

import React, { useEffect } from 'react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { TopBar } from '@/components/navigation/TopBar';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';
import { Canvas } from '@/components/canvas/Canvas';
import { Inspector } from '@/components/inspector/Inspector';
import { CommandPalette } from '@/components/search/CommandPalette';
import { DiagnosticsDrawer } from '@/components/diagnostics/DiagnosticsDrawer';

export default function StackfoldPage() {
  const scan = useStackfoldStore(s => s.scan);
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  useEffect(() => {
    // Initial auto-scan of bundled sample ecommerce fixture on load
    if (!rawGraph) {
      scan({ fixture: 'sample-ecommerce-app' });
    }
  }, [rawGraph, scan]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090a0f] text-slate-100 overflow-hidden select-none">
      {/* Top Navigation */}
      <TopBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <ProjectSidebar />

        {/* Center Interactive Graph Canvas */}
        <main className="flex-1 h-full relative overflow-hidden">
          <Canvas />
        </main>

        {/* Right Inspector Panel */}
        <Inspector />
      </div>

      {/* Overlays */}
      <CommandPalette />
      <DiagnosticsDrawer />
    </div>
  );
}
