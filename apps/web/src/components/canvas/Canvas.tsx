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
  const layoutedGraph = useStackfoldStore(s => s.layoutedGraph);
  const selectNode = useStackfoldStore(s => s.selectNode);
  const activeView = useStackfoldStore(s => s.activeView);
  const isLoading = useStackfoldStore(s => s.isLoading);

  const initialNodes = useMemo<Node[]>(() => {
    if (!layoutedGraph) return [];
    return layoutedGraph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n as unknown as Record<string, unknown>,
    }));
  }, [layoutedGraph]);

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

  return (
    <div className="w-full h-full relative bg-[#090a0f] overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-[#090a0f]/80 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium text-slate-300">Scanning repository & computing layout...</div>
        </div>
      )}

      {nodes.length === 0 && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6">
          <div className="max-w-md p-8 rounded-2xl bg-[#111420] border border-[#222738] shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">No matching nodes in this view</h3>
            <p className="text-xs text-slate-400 mb-4">
              Try switching views, resetting your filters, or selecting another repository in the left sidebar.
            </p>
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
