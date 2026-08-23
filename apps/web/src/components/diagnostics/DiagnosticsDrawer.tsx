'use client';

import React from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';

export function DiagnosticsDrawer() {
  const isOpen = useStackfoldStore(s => s.isDiagnosticsDrawerOpen);
  const setOpen = useStackfoldStore(s => s.setDiagnosticsDrawerOpen);
  const rawGraph = useStackfoldStore(s => s.rawGraph);

  if (!isOpen) return null;

  const diagnostics = rawGraph?.diagnostics || [];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0d0f17] border-t border-[#1c2233] shadow-2xl max-h-72 flex flex-col select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#1c2233] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-xs text-slate-200">
            Scan Diagnostics &amp; Warnings ({diagnostics.length})
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1c2233]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Diagnostics List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {diagnostics.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-4 text-center">
            No warnings or syntax errors detected. Repository static analysis completed cleanly.
          </div>
        ) : (
          diagnostics.map((d, idx) => (
            <div
              key={idx}
              className={clsx(
                'p-2.5 rounded-lg border text-xs flex items-start gap-3',
                d.level === 'error'
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  : d.level === 'warning'
                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                  : 'bg-sky-950/20 border-sky-800/40 text-sky-300'
              )}
            >
              {d.level === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 rounded bg-black/40">
                    {d.code}
                  </span>
                  {d.filePath && (
                    <span className="font-mono text-[10px] text-slate-400 truncate">
                      {d.filePath}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-slate-200 text-xs">{d.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
