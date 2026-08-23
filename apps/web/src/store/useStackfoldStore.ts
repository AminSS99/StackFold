import { create } from 'zustand';
import type {
  ProjectGraph,
  GraphNode,
  GraphViewType,
  NodeType,
  LayoutedGraph,
} from '@stackfold/graph';
import {
  extractViewGraph,
  computeGraphLayout,
  filterGraph,
} from '@stackfold/graph';

interface ScanStats {
  durationMs: number;
  scannedFilesCount: number;
}

interface StackfoldState {
  // Graph state
  rawGraph: ProjectGraph | null;
  layoutedGraph: LayoutedGraph | null;
  selectedNodeId: string | null;
  selectedNode: GraphNode | null;
  hoveredNodeId: string | null;

  // View and layout configuration
  activeView: GraphViewType;
  layoutDirection: 'LR' | 'TB';
  activeInspectorTab: 'details' | 'impact' | 'evidence' | 'ai';

  // Filters & Search
  searchQuery: string;
  enabledNodeTypes: Set<NodeType>;

  // UI state
  isLoading: boolean;
  error: string | null;
  isCommandPaletteOpen: boolean;
  isDiagnosticsDrawerOpen: boolean;
  scanStats: ScanStats | null;

  // Actions
  scan: (params: { rootPath?: string; fixture?: string }) => Promise<void>;
  setActiveView: (view: GraphViewType) => void;
  setLayoutDirection: (dir: 'LR' | 'TB') => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  toggleNodeType: (type: NodeType) => void;
  resetNodeTypeFilters: () => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDiagnosticsDrawerOpen: (open: boolean) => void;
  setActiveInspectorTab: (tab: 'details' | 'impact' | 'evidence' | 'ai') => void;
  recomputeLayout: () => void;
}

const ALL_NODE_TYPES: NodeType[] = [
  'repository',
  'application',
  'package',
  'directory',
  'source_module',
  'component',
  'api_route',
  'function',
  'database_model',
  'environment_variable',
  'external_service',
];

export const useStackfoldStore = create<StackfoldState>((set, get) => ({
  rawGraph: null,
  layoutedGraph: null,
  selectedNodeId: null,
  selectedNode: null,
  hoveredNodeId: null,

  activeView: 'architecture',
  layoutDirection: 'LR',
  activeInspectorTab: 'details',

  searchQuery: '',
  enabledNodeTypes: new Set(ALL_NODE_TYPES),

  isLoading: false,
  error: null,
  isCommandPaletteOpen: false,
  isDiagnosticsDrawerOpen: false,
  scanStats: null,

  scan: async params => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan repository');
      }

      const graph = data.graph as ProjectGraph;
      set({
        rawGraph: graph,
        scanStats: {
          durationMs: data.durationMs,
          scannedFilesCount: data.scannedFilesCount,
        },
        isLoading: false,
        selectedNodeId: null,
        selectedNode: null,
      });

      get().recomputeLayout();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setActiveView: view => {
    set({ activeView: view });
    get().recomputeLayout();
  },

  setLayoutDirection: dir => {
    set({ layoutDirection: dir });
    get().recomputeLayout();
  },

  selectNode: nodeId => {
    const { rawGraph } = get();
    if (!nodeId || !rawGraph) {
      set({ selectedNodeId: null, selectedNode: null });
      return;
    }
    const node = rawGraph.nodes.find(n => n.id === nodeId) || null;
    set({ selectedNodeId: nodeId, selectedNode: node });
  },

  setHoveredNode: nodeId => {
    set({ hoveredNodeId: nodeId });
  },

  toggleNodeType: type => {
    const { enabledNodeTypes } = get();
    const next = new Set(enabledNodeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    set({ enabledNodeTypes: next });
    get().recomputeLayout();
  },

  resetNodeTypeFilters: () => {
    set({ enabledNodeTypes: new Set(ALL_NODE_TYPES), searchQuery: '' });
    get().recomputeLayout();
  },

  setSearchQuery: query => {
    set({ searchQuery: query });
    get().recomputeLayout();
  },

  setCommandPaletteOpen: open => set({ isCommandPaletteOpen: open }),
  setDiagnosticsDrawerOpen: open => set({ isDiagnosticsDrawerOpen: open }),
  setActiveInspectorTab: tab => set({ activeInspectorTab: tab }),

  recomputeLayout: () => {
    const { rawGraph, activeView, layoutDirection, enabledNodeTypes, searchQuery } = get();
    if (!rawGraph) return;

    // 1. Extract view graph
    const viewGraph = extractViewGraph(rawGraph, activeView);

    // 2. Apply filters (Node Types + Search Query)
    const filtered = filterGraph(
      { ...rawGraph, nodes: viewGraph.nodes, edges: viewGraph.edges },
      {
        nodeTypes: Array.from(enabledNodeTypes),
        searchQuery: searchQuery.trim() || undefined,
      }
    );

    // 3. Compute layout
    const layout = computeGraphLayout(filtered.nodes, filtered.edges, {
      direction: layoutDirection,
      viewType: activeView,
    });

    set({ layoutedGraph: layout });
  },
}));
