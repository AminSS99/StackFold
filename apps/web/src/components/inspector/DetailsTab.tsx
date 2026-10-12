'use client';

import React from 'react';
import { Copy, ExternalLink, ArrowRight, ArrowLeft, Target } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import type { PreferredEditor } from '@stackfold/platform';
import { PropertyList, type PropertyItem } from '@/components/ui/PropertyList';
import { Badge } from '@/components/ui/Badge';

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

  // Build property items for PropertyList
  const propertyItems: PropertyItem[] = [
    {
      key: 'type',
      label: 'Type',
      value: (
        <Badge variant="yellow" size="sm">
          {node.type}
        </Badge>
      ),
      copyable: false,
    },
    {
      key: 'confidence',
      label: 'Confidence',
      value: (
        <Badge variant="success" size="sm">
          {node.confidence}
        </Badge>
      ),
      copyable: false,
    },
  ];

  if (node.filePath) {
    propertyItems.push({
      key: 'filePath',
      label: 'File Path',
      value: node.filePath,
      rawText: node.filePath,
      copyable: true,
    });
  }

  // Add specific metadata properties
  if (node.metadata) {
    Object.entries(node.metadata).forEach(([k, v]) => {
      if (typeof v !== 'object' || v === null) {
        propertyItems.push({
          key: k,
          label: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: String(v),
          rawText: String(v),
          copyable: true,
        });
      }
    });
  }

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Focus / Isolate Subgraph Action */}
      <button
        onClick={() => (isCurrentlyFocused ? resetFocus() : focusSubgraph(node.id))}
        className="w-full py-2 px-3 bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] hover:border-[#3b3f31] rounded-lg text-[#f6f7f2] font-medium flex items-center justify-center gap-2 transition-colors text-xs shadow-sm"
      >
        <Target className="w-3.5 h-3.5 text-[#f6c945]" />
        <span>{isCurrentlyFocused ? 'Reset Focus (Show All)' : 'Isolate Subgraph on Canvas'}</span>
      </button>

      {/* File Location & Editor Deep Link */}
      {node.filePath && (
        <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#a5aa9b] font-medium">Source Location</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#74796d]">Editor:</span>
              <select
                value={preferredEditor}
                onChange={e => setPreferredEditor(e.target.value as PreferredEditor)}
                className="bg-[#070806] border border-[#2a2d24] text-[10px] text-[#f6f7f2] rounded px-1.5 py-0.5 focus:outline-none"
              >
                {EDITORS.map(ed => (
                  <option key={ed.id} value={ed.id}>
                    {ed.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#070806] p-2 rounded-lg border border-[#2a2d24]">
            <span className="font-mono text-xs text-[#f6f7f2] truncate">{node.filePath}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyPath}
                title="Copy relative file path"
                className="p-1 text-[#a5aa9b] hover:text-[#f6c945] rounded hover:bg-[#1b1e17] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleOpenFile}
                title={`Open in ${preferredEditor.toUpperCase()}`}
                className="p-1 text-[#a5aa9b] hover:text-[#f6c945] rounded hover:bg-[#1b1e17] flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Properties */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-1">
        <div className="text-[11px] text-[#a5aa9b] font-medium mb-1">Entity Properties</div>
        <PropertyList items={propertyItems} />
      </div>

      {/* Incoming Relationships */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="text-[11px] text-[#a5aa9b] font-medium flex items-center justify-between">
          <span>Incoming Connections ({incomingEdges.length})</span>
          <ArrowLeft className="w-3.5 h-3.5 text-[#f6c945]" />
        </div>
        {incomingEdges.length === 0 ? (
          <div className="text-xs text-[#74796d] italic">No incoming relationships</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {incomingEdges.map(edge => {
              const srcNode = nodeMap.get(edge.source);
              return (
                <button
                  key={edge.id}
                  onClick={() => selectNode(edge.source)}
                  className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#f6f7f2] truncate text-xs">
                      {srcNode?.displayName || edge.source}
                    </div>
                    <div className="text-[10px] text-[#74796d]">{srcNode?.type || 'node'}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#1b1e17] text-[#f6c945] text-[9px] font-mono shrink-0 border border-[#2a2d24]">
                    {edge.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Outgoing Relationships */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="text-[11px] text-[#a5aa9b] font-medium flex items-center justify-between">
          <span>Outgoing Connections ({outgoingEdges.length})</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#f6c945]" />
        </div>
        {outgoingEdges.length === 0 ? (
          <div className="text-xs text-[#74796d] italic">No outgoing relationships</div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {outgoingEdges.map(edge => {
              const tgtNode = nodeMap.get(edge.target);
              return (
                <button
                  key={edge.id}
                  onClick={() => selectNode(edge.target)}
                  className="w-full p-2 rounded-lg bg-[#070806] hover:bg-[#1b1e17] border border-[#2a2d24] flex items-center justify-between text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#f6f7f2] truncate text-xs">
                      {tgtNode?.displayName || edge.target}
                    </div>
                    <div className="text-[10px] text-[#74796d]">{tgtNode?.type || 'node'}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#1b1e17] text-[#f6c945] text-[9px] font-mono shrink-0 border border-[#2a2d24]">
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
