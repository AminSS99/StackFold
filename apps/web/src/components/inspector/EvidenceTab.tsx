'use client';

import React from 'react';
import { SearchCheck, FileCode, CheckCircle2 } from 'lucide-react';
import type { GraphNode } from '@stackfold/graph';

interface EvidenceTabProps {
  node: GraphNode;
}

export function EvidenceTab({ node }: EvidenceTabProps) {
  const { evidence, confidence } = node;

  return (
    <div className="space-y-4 text-xs">
      {/* Confidence Header */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <SearchCheck className="w-4 h-4 text-indigo-400" />
            Deterministic Verification
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {confidence} CONFIDENCE
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          This entity was extracted directly via static AST analysis and schema parsing.
        </p>
      </div>

      {/* Detector Rule */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="text-[11px] text-slate-400 font-medium">Detector Engine</div>
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between py-0.5 border-b border-[#1b2032]">
            <span className="text-slate-400">Detector ID:</span>
            <span className="text-indigo-300">{evidence.detectorId}</span>
          </div>
          <div className="flex items-center justify-between py-0.5 border-b border-[#1b2032]">
            <span className="text-slate-400">Rule:</span>
            <span className="text-slate-200">{evidence.rule}</span>
          </div>
          {evidence.notes && (
            <div className="pt-1 text-[11px] text-slate-300">{evidence.notes}</div>
          )}
        </div>
      </div>

      {/* Discovered Code Snippet */}
      {evidence.codeSnippet && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            Source Proof Snippet
          </div>
          <pre className="p-2.5 rounded-lg bg-[#0c0e16] border border-[#1b2032] font-mono text-[11px] text-emerald-300 overflow-x-auto">
            {evidence.codeSnippet}
          </pre>
        </div>
      )}

      {/* Source Range Coordinates */}
      {evidence.sourceRange && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium">AST Line Coordinates</div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-[#0c0e16] border border-[#1b2032]">
              <span className="text-slate-500 block text-[10px]">Start:</span>
              <span className="text-slate-200">
                Line {evidence.sourceRange.startLine}:{evidence.sourceRange.startColumn}
              </span>
            </div>
            <div className="p-2 rounded bg-[#0c0e16] border border-[#1b2032]">
              <span className="text-slate-500 block text-[10px]">End:</span>
              <span className="text-slate-200">
                Line {evidence.sourceRange.endLine}:{evidence.sourceRange.endColumn}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
