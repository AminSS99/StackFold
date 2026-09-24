'use client';

import React from 'react';
import { SearchCheck, FileCode, CheckCircle2 } from 'lucide-react';
import type { GraphNode } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Badge } from '@/components/ui/Badge';

interface EvidenceTabProps {
  node: GraphNode;
}

export function EvidenceTab({ node }: EvidenceTabProps) {
  const openSelectedFileInEditor = useStackfoldStore(s => s.openSelectedFileInEditor);
  const { evidence, confidence } = node;

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Confidence Header */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#a5aa9b] font-medium flex items-center gap-1.5">
            <SearchCheck className="w-4 h-4 text-[#f6c945]" />
            Deterministic Verification
          </span>
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
            {confidence} CONFIDENCE
          </Badge>
        </div>
        <p className="text-[11px] text-[#a5aa9b]">
          Extracted directly via local TypeScript AST compilers and schema parsers without inference.
        </p>
      </div>

      {/* Detector Rule */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="text-[11px] text-[#a5aa9b] font-medium">Detector Engine</div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between py-1 border-b border-[#2a2d24]">
            <span className="text-[#a5aa9b]">Detector ID:</span>
            <span className="text-[#f6c945]">{evidence.detectorId}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#2a2d24]">
            <span className="text-[#a5aa9b]">Rule:</span>
            <span className="text-[#f6f7f2]">{evidence.rule}</span>
          </div>
          {evidence.notes && (
            <div className="pt-1 text-[11px] text-[#a5aa9b] font-sans">{evidence.notes}</div>
          )}
        </div>
      </div>

      {/* Discovered Code Snippet using CodeBlock */}
      {evidence.codeSnippet && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-[#a5aa9b] font-medium flex items-center gap-1.5 px-1">
            <FileCode className="w-3.5 h-3.5 text-[#f6c945]" />
            Source Proof Snippet
          </div>
          <CodeBlock
            code={evidence.codeSnippet}
            language="typescript"
            filePath={node.filePath}
            startLine={evidence.sourceRange?.startLine || 1}
            onOpenInEditor={openSelectedFileInEditor}
          />
        </div>
      )}

      {/* Source Range Coordinates */}
      {evidence.sourceRange && (
        <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
          <div className="text-[11px] text-[#a5aa9b] font-medium">AST Range Coordinates</div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-[#070806] border border-[#2a2d24]">
              <span className="text-[#74796d] block text-[10px]">Start:</span>
              <span className="text-[#f6f7f2]">
                Line {evidence.sourceRange.startLine}:{evidence.sourceRange.startColumn}
              </span>
            </div>
            <div className="p-2 rounded bg-[#070806] border border-[#2a2d24]">
              <span className="text-[#74796d] block text-[10px]">End:</span>
              <span className="text-[#f6f7f2]">
                Line {evidence.sourceRange.endLine}:{evidence.sourceRange.endColumn}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
