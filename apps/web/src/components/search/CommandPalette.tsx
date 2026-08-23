'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, Globe, Database, Cloud, KeyRound, FileCode, Component } from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { searchGraphNodes } from '@stackfold/graph';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  application: <Layers className="w-4 h-4 text-purple-400" />,
  package: <Layers className="w-4 h-4 text-slate-400" />,
  api_route: <Globe className="w-4 h-4 text-emerald-400" />,
  database_model: <Database className="w-4 h-4 text-cyan-400" />,
  external_service: <Cloud className="w-4 h-4 text-sky-400" />,
  environment_variable: <KeyRound className="w-4 h-4 text-amber-400" />,
  source_module: <FileCode className="w-4 h-4 text-slate-400" />,
  component: <Component className="w-4 h-4 text-violet-400" />,
};

export function CommandPalette() {
  const isOpen = useStackfoldStore(s => s.isCommandPaletteOpen);
  const setOpen = useStackfoldStore(s => s.setCommandPaletteOpen);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const selectNode = useStackfoldStore(s => s.selectNode);

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen || !rawGraph) return null;

  const results = searchGraphNodes(rawGraph, query, 15);

  const handleSelect = (nodeId: string) => {
    selectNode(nodeId);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-2xl bg-[#111420] border border-[#262c3f] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-4 border-b border-[#1f2538] flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search API routes, database models, files, services..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1c2233]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching nodes found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map(({ node }) => (
              <button
                key={node.id}
                onClick={() => handleSelect(node.id)}
                className="w-full p-2.5 rounded-xl hover:bg-[#1a1f30] border border-transparent hover:border-[#2a324b] flex items-center justify-between text-left transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#0c0e16] border border-[#1b2032] shrink-0">
                    {TYPE_ICONS[node.type] || <FileCode className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 group-hover:text-indigo-300 text-xs truncate">
                      {node.displayName}
                    </div>
                    {node.filePath && (
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {node.filePath}
                      </div>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1c2233] text-slate-400 border border-[#2a3147] shrink-0">
                  {node.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f2538] bg-[#0c0e16] flex items-center justify-between text-[11px] text-slate-500">
          <span>Use ↑ ↓ to navigate, ↵ to select</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
