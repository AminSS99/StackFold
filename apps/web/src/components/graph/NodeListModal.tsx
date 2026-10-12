import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { Badge } from '@/components/ui/Badge';

interface NodeListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NodeListModal({ isOpen, onClose }: NodeListModalProps) {
  const layoutedGraph = useStackfoldStore(s => s.layoutedGraph);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const selectedNodeId = useStackfoldStore(s => s.selectedNodeId);

  const [search, setSearch] = useState('');

  const nodes = useMemo(() => layoutedGraph?.nodes ?? [], [layoutedGraph]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    return nodes.filter(
      n =>
        n.displayName.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.filePath && n.filePath.toLowerCase().includes(q))
    );
  }, [nodes, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#070806]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Accessible Node List"
        className="relative bg-[#0d0f0c] border border-[#2a2d24] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2a2d24] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f6f7f2]">
              All Graph Entities ({nodes.length})
            </h2>
            <p className="text-xs text-[#a5aa9b] mt-0.5">
              Accessible non-spatial tabular view of entities in current view
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-[#2a2d24] bg-[#141611]/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#070806] border border-[#2a2d24] rounded-lg">
            <Search className="w-3.5 h-3.5 text-[#a5aa9b] shrink-0" />
            <input
              type="text"
              placeholder="Search by name, type, or file path..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#f6f7f2] placeholder-[#74796d] w-full"
              autoFocus
            />
          </div>
        </div>

        {/* Node list table */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2a2d24]">
          {filteredNodes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#74796d]">
              No matching entities found in the active view.
            </div>
          ) : (
            filteredNodes.map(node => {
              const isSelected = node.id === selectedNodeId;
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    selectNode(node.id);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-[#141611] transition-colors ${
                    isSelected ? 'bg-[rgba(246,201,69,0.08)] border-l-2 border-[#f6c945]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#f6f7f2] truncate">
                        {node.displayName}
                      </span>
                      <Badge variant="taxonomy" size="sm">
                        {node.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {node.filePath && (
                      <div className="text-[11px] font-mono text-[#74796d] truncate mt-0.5">
                        {node.filePath}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#74796d] shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
