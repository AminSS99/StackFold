'use client';

import React, { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
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
import { DeploymentEnvironmentNode, CloudResourceNode } from './nodes/EnvironmentSafetyNode';
import { ChangeEventNode } from './nodes/ChangeEventNode';
import { RiskBoundaryNode } from './nodes/RiskBoundaryNode';
import { ApiOperationNode, PermissionScopeNode, IdentityDomainNode } from './nodes/ArchitecturePolicyNode';
import { BrowserSessionNode, SecurityProbeNode, CacheLayerNode } from './nodes/SecurityTopologyNode';
import { CustomEdge } from './edges/CustomEdge';
import { FocusBanner } from './FocusBanner';
import { EmptyWorkspace } from '../onboarding/EmptyWorkspace';
import { CanvasDock } from '../graph/CanvasDock';
import { GraphLegend } from '../graph/GraphLegend';
import { NodeListModal } from '../graph/NodeListModal';
import { X, Sparkles } from 'lucide-react';

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
  deployment_environment: DeploymentEnvironmentNode,
  cloud_resource: CloudResourceNode,
  change_event: ChangeEventNode,
  risk_boundary: RiskBoundaryNode,
  api_operation: ApiOperationNode,
  permission_scope: PermissionScopeNode,
  identity_domain: IdentityDomainNode,
  security_probe: SecurityProbeNode,
  browser_session: BrowserSessionNode,
  cache_layer: CacheLayerNode,
  signer: BrowserSessionNode,
  verifier: BrowserSessionNode,
  signature_vector: SecurityProbeNode,
};

const EDGE_TYPES = {
  custom: CustomEdge,
};

function SelectionViewport({ selectedNodeId }: { selectedNodeId: string | null }) {
  const { getNode, setCenter } = useReactFlow();

  useEffect(() => {
    if (!selectedNodeId) return;
    const selected = getNode(selectedNodeId);
    if (!selected) return;
    const width = selected.measured?.width || 200;
    const height = selected.measured?.height || 90;
    setCenter(selected.position.x + width / 2, selected.position.y + height / 2, {
      zoom: 1.05,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260,
    });
  }, [getNode, selectedNodeId, setCenter]);

  return null;
}

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

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isNodeListOpen, setIsNodeListOpen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 719px)');
    const applyResponsiveMinimap = () => setIsMinimapOpen(!mobileQuery.matches);
    applyResponsiveMinimap();
    mobileQuery.addEventListener('change', applyResponsiveMinimap);
    return () => mobileQuery.removeEventListener('change', applyResponsiveMinimap);
  }, []);

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
          width: n.width,
          opacity: isDimmed ? 0.22 : 1,
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
    <div className="w-full h-full relative bg-[#070806] overflow-hidden">
      {/* Active Focus Subgraph Banner */}
      <FocusBanner />

      {/* Loading & Cancellation Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#070806]/85 z-30 flex flex-col items-center justify-center gap-4 backdrop-blur-sm select-none">
          <div className="w-10 h-10 border-2 border-[#f6c945] border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-slate-100">
              {scanProgressMessage || 'Scanning repository & computing layout...'}
            </div>
            <div className="text-xs text-[#a5aa9b]">
              Static analysis in progress (Zero secrets collected)
            </div>
          </div>
          <button
            onClick={cancelScan}
            className="mt-2 px-3 py-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-xs text-[#f6f7f2] flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Scan</span>
          </button>
        </div>
      )}

      {/* Contextual Empty State for current View */}
      {nodes.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none select-none">
          <div className="p-6 rounded-2xl bg-[#0d0f0c]/95 border border-[#2a2d24] backdrop-blur-md max-w-md text-center space-y-3 pointer-events-auto shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#f6c945]/10 border border-[#f6c945]/30 text-[#f6c945] flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#f6f7f2]">
                {activeView === 'api_flow' && 'No API Routes in this Project'}
                {activeView === 'database' && 'No Database Models Detected'}
                {activeView === 'dependencies' && 'No Dependencies in Current View'}
                {activeView === 'architecture' && 'No Entities in Current Filter'}
              </h3>
              <p className="text-xs text-[#a5aa9b] leading-relaxed">
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
                  className="px-4 py-2 rounded-xl bg-[#f6c945] hover:bg-[#ffda67] text-[#070806] text-xs font-semibold transition-colors shadow-md"
                >
                  Switch to Architecture
                </button>
              )}
              {activeView !== 'dependencies' && (
                <button
                  onClick={() => setActiveView('dependencies')}
                  className="px-4 py-2 rounded-xl bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#f6f7f2] text-xs font-semibold transition-colors"
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
        fitViewOptions={{ padding: 0.18, maxZoom: 1.15 }}
        minZoom={0.1}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'custom' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#25291f" />
        <SelectionViewport selectedNodeId={selectedNodeId} />

        {/* Floating Canvas Dock */}
        <CanvasDock
          onToggleLegend={() => setIsLegendOpen(prev => !prev)}
          isLegendOpen={isLegendOpen}
          onToggleNodeList={() => setIsNodeListOpen(true)}
          onToggleMinimap={() => setIsMinimapOpen(prev => !prev)}
          isMinimapOpen={isMinimapOpen}
        />

        {/* Legend Overlay */}
        <GraphLegend isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

        {/* Minimap */}
        {isMinimapOpen && (
          <MiniMap
            position="bottom-right"
            nodeColor={node => {
              switch (node.type) {
                case 'application':
                  return '#a78bfa';
                case 'api_route':
                  return '#10b981';
                case 'database_model':
                  return '#06b6d4';
                case 'external_service':
                  return '#38bdf8';
                case 'environment_variable':
                  return '#f59e0b';
                case 'deployment_environment':
                  return '#8b5cf6';
                case 'cloud_resource':
                  return '#fb7185';
                case 'change_event':
                  return '#f97316';
                case 'risk_boundary':
                  return '#ef4444';
                case 'api_operation':
                  return '#0ea5e9';
                case 'permission_scope':
                  return '#f59e0b';
                case 'identity_domain':
                  return '#d946ef';
                case 'security_probe':
                  return '#22c55e';
                case 'browser_session':
                  return '#818cf8';
                case 'cache_layer':
                  return '#f6c945';
                case 'signer':
                  return '#38bdf8';
                case 'verifier':
                  return '#818cf8';
                case 'signature_vector':
                  return '#22c55e';
                default:
                  return '#64748b';
              }
            }}
            maskColor="rgba(7, 8, 6, 0.72)"
          />
        )}
      </ReactFlow>

      {/* Accessible Node List Modal */}
      <NodeListModal isOpen={isNodeListOpen} onClose={() => setIsNodeListOpen(false)} />
    </div>
  );
}
