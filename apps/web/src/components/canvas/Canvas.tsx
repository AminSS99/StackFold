'use client';

import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStackfoldStore } from '@/store/useStackfoldStore';
import { AppNode } from './nodes/AppNode';
import { ApiRouteNode } from './nodes/ApiRouteNode';
import { DatabaseModelNode } from './nodes/DatabaseModelNode';
import { ServiceNode } from './nodes/ServiceNode';
import { EnvVarNode } from './nodes/EnvVarNode';
import { ModuleNode, ComponentNode } from './nodes/ModuleNode';
import { CustomEdge } from './edges/CustomEdge';
import { FocusBanner } from './FocusBanner';
import { EmptyWorkspace } from '../onboarding/EmptyWorkspace';
import { X, RefreshCw, Sparkles } from 'lucide-react';

const NODE_TYPES = {
  repository: AppNode,
  application: AppNode,
  package: AppNode,
  api_route: ApiRouteNode,
  database_model: DatabaseModelNode,
  external_service: ServiceNode,
  environment_variable: EnvVarNode,
  source_module: ModuleNode,
  component: ComponentNode,
  function: ModuleNode,
  directory: ModuleNode,
};

const EDGE_TYPES = {
  custom: CustomEdge,
};

export function Canvas() {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const layoutedGraph = useStackfoldStore(s => s.layoutedGraph);
  const selectedNodeId = useStackfoldStore(s => s.selectedNodeId);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const focusSubgraph = useStackfoldStore(s => s.focusSubgraph);
  const isLoading = useStackfoldStore(s => s.isLoading);
  const cancelScan = useStackfoldStore(s => s.cancelScan);
  const scanProgressMessage = useStackfoldStore(s => s.scanProgressMessage);
  const activeView = useStackfoldStore(s => s.activeView);
  const setActiveView = useStackfoldStore(s => s.setActiveView);

  // Compute connected nodes for selection dimming
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId || !rawGraph) return null;
    const connected = new Set<string>([selectedNodeId]);
    for (const edge of rawGraph.edges) {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    }
    return connected;
  }, [selectedNodeId, rawGraph]);

  const initialNodes = useMemo<Node[]>(() => {
    if (!layoutedGraph) return [];
    return layoutedGraph.nodes.map(n => {
      const isDimmed = connectedNodeIds !== null && !connectedNodeIds.has(n.id);
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        data: n as unknown as Record<string, unknown>,
        style: {
          opacity: isDimmed ? 0.25 : 1,
          transition: 'opacity 0.2s ease',
        },
      };
    });
  }, [layoutedGraph, connectedNodeIds]);

  const initialEdges = useMemo<Edge[]>(() => {
    if (!layoutedGraph) return [];
    return layoutedGraph.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      data: e as unknown as Record<string, unknown>,
    }));
  }, [layoutedGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!rawGraph && !isLoading) {
    return <EmptyWorkspace />;
  }

  return (
    <div className="w-full h-full relative bg-[#090a0f] overflow-hidden">
      {/* Active Focus Subgraph Banner */}
      <FocusBanner />

      {/* Loading & Cancellation Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#090a0f]/85 z-30 flex flex-col items-center justify-center gap-4 backdrop-blur-sm select-none">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-slate-100">
              {scanProgressMessage || 'Scanning repository & computing layout...'}
            </div>
            <div className="text-xs text-slate-400">
              Static analysis in progress (Zero secrets collected)
            </div>
          </div>
          <button
            onClick={cancelScan}
            className="mt-2 px-3 py-1.5 rounded-lg bg-[#181d2f] hover:bg-[#22293e] border border-[#2d354e] text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Scan</span>
          </button>
        </div>
      )}

      {/* Contextual Empty State for current View */}
      {nodes.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none select-none">
          <div className="p-6 rounded-2xl bg-[#101320]/95 border border-[#22293e] backdrop-blur-md max-w-md text-center space-y-3 pointer-events-auto shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100">
                {activeView === 'api_flow' && 'No API Routes in this Project'}
                {activeView === 'database' && 'No Database Models Detected'}
                {activeView === 'dependencies' && 'No Dependencies in Current View'}
                {activeView === 'architecture' && 'No Entities in Current Filter'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeView === 'api_flow' &&
                  'This project does not expose backend HTTP/REST routes (appears to be a client-side SPA or utility library).'}
                {activeView === 'database' &&
                  'No Prisma schema or relational database models were found in the codebase.'}
                {activeView === 'dependencies' &&
                  'No package dependencies match the current filter criteria.'}
                {activeView === 'architecture' &&
                  'Try adjusting your graph density or node filters in the sidebar.'}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              {activeView !== 'architecture' && (
                <button
                  onClick={() => setActiveView('architecture')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
                >
                  Switch to Architecture
                </button>
              )}
              {activeView !== 'dependencies' && (
                <button
                  onClick={() => setActiveView('dependencies')}
                  className="px-4 py-2 rounded-xl bg-[#171c2b] hover:bg-[#20273c] border border-[#2b3550] text-slate-200 text-xs font-semibold transition-colors"
                >
                  View Dependencies
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeDoubleClick={(_, node) => focusSubgraph(node.id)}
        onPaneClick={() => selectNode(null)}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'custom' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1b2032" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={node => {
            switch (node.type) {
              case 'application':
                return '#a855f7';
              case 'api_route':
                return '#10b981';
              case 'database_model':
                return '#06b6d4';
              case 'external_service':
                return '#38bdf8';
              case 'environment_variable':
                return '#f59e0b';
              default:
                return '#64748b';
            }
          }}
          maskColor="rgba(9, 10, 15, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
