'use client';

import React from 'react';
import { Copy, ExternalLink, ArrowRight, ArrowLeft, Target, Code2 } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { PreferredEditor } from '@stackfold/platform';

interface DetailsTabProps {
  node: GraphNode;
  incomingEdges: GraphEdge[];
  outgoingEdges: GraphEdge[];
}

const EDITORS: Array<{ id: PreferredEditor; label: string }> = [
  { id: 'vscode', label: 'VS Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'webstorm', label: 'WebStorm' },
];

export function DetailsTab({ node, incomingEdges, outgoingEdges }: DetailsTabProps) {
  const selectNode = useStackfoldStore(s => s.selectNode);
  const focusSubgraph = useStackfoldStore(s => s.focusSubgraph);
  const focusedNodeId = useStackfoldStore(s => s.focusedNodeId);
  const resetFocus = useStackfoldStore(s => s.resetFocus);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const openSelectedFileInEditor = useStackfoldStore(s => s.openSelectedFileInEditor);
  const preferredEditor = useStackfoldStore(s => s.preferredEditor);
  const setPreferredEditor = useStackfoldStore(s => s.setPreferredEditor);

  const handleCopyPath = () => {
    if (node.filePath) {
      navigator.clipboard.writeText(node.filePath);
    }
  };

  const handleOpenFile = () => {
    if (node.filePath) {
      openSelectedFileInEditor(node.filePath);
    }
  };

  const isCurrentlyFocused = focusedNodeId === node.id;
  const nodeMap = new Map(rawGraph?.nodes.map(n => [n.id, n]));

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Focus / Isolate Subgraph Action */}
      <button
        onClick={() => (isCurrentlyFocused ? resetFocus() : focusSubgraph(node.id))}
        className="w-full py-2 px-3 bg-[#181d2f] hover:bg-[#22293e] border border-[#2d354e] rounded-xl text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors text-xs shadow-sm"
      >
        <Target className="w-3.5 h-3.5 text-indigo-400" />
        <span>{isCurrentlyFocused ? 'Reset Focus (Show All)' : 'Isolate Subgraph on Canvas'}</span>
      </button>

      {/* File Location & Editor Deep Link */}
      {node.filePath && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Source File</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Editor:</span>
              <select
                value={preferredEditor}
                onChange={e => setPreferredEditor(e.target.value as PreferredEditor)}
                className="bg-[#0c0e16] border border-[#222738] text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
              >
                {EDITORS.map(ed => (
                  <option key={ed.id} value={ed.id}>
                    {ed.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#0c0e16] p-2 rounded-lg border border-[#1b2032]">
            <span className="font-mono text-xs text-slate-300 truncate">{node.filePath}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyPath}
                title="Copy relative file path"
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#1f253a]"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOpenFile}
                title={`Open in ${preferredEditor.toUpperCase()}`}
                className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-[#1f253a] flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Attributes */}
      {Object.keys(node.metadata || {}).length > 0 && (
        <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
          <div className="text-[11px] text-slate-400 font-medium">Node Attributes</div>
          <div className="space-y-1.5 text-xs font-mono">
            {Object.entries(node.metadata).map(([key, val]) => {
              if (typeof val === 'object' && val !== null) {
                return (
                  <div key={key} className="pt-1">
                    <span className="text-slate-400">{key}:</span>
                    <pre className="mt-1 p-2 rounded bg-[#0c0e16] text-[10px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(val, null, 2)}
                    </pre>
                  </div>
                );
              }
              return (
                <div key={key} className="flex items-center justify-between py-0.5 border-b border-[#1b2032]">
                  <span className="text-slate-400">{key}</span>
                  <span className="text-slate-200">{String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Incoming Relationships */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
          <span>Incoming Connections ({incomingEdges.length})</span>
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        {incomingEdges.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No incoming relationships</div>
        ) : (
          <div className="space-y-1.5">
            {incomingEdges.map(edge => {
              const srcNode = nodeMap.get(edge.source);
              return (
                <button
                  key={edge.id}
                  onClick={() => selectNode(edge.source)}
                  className="w-full p-2 rounded-lg bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate text-xs">
                      {srcNode?.displayName || edge.source}
                    </div>
                    <div className="text-[10px] text-slate-400">{srcNode?.type || 'node'}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#1c2233] text-indigo-300 text-[9px] font-mono shrink-0">
                    {edge.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Outgoing Relationships */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
          <span>Outgoing Connections ({outgoingEdges.length})</span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        {outgoingEdges.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No outgoing relationships</div>
        ) : (
          <div className="space-y-1.5">
            {outgoingEdges.map(edge => {
              const tgtNode = nodeMap.get(edge.target);
              return (
                <button
                  key={edge.id}
                  onClick={() => selectNode(edge.target)}
                  className="w-full p-2 rounded-lg bg-[#0c0e16] hover:bg-[#1b2032] border border-[#1b2032] flex items-center justify-between text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate text-xs">
                      {tgtNode?.displayName || edge.target}
                    </div>
                    <div className="text-[10px] text-slate-400">{tgtNode?.type || 'node'}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#1c2233] text-indigo-300 text-[9px] font-mono shrink-0">
                    {edge.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
