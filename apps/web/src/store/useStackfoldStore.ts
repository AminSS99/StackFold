import { create } from 'zustand';
import type {
  ProjectGraph,
  GraphNode,
  GraphViewType,
  NodeType,
  LayoutedGraph,
  DensityLevel,
} from '@stackfold/graph';
import {
  extractViewGraph,
  computeGraphLayout,
  filterGraph,
} from '@stackfold/graph';
import {
  getPlatformAdapter,
  type PlatformAdapter,
  type PreferredEditor,
  type RecentProjectEntry,
} from '@stackfold/platform';

interface ScanStats {
  durationMs: number;
  scannedFilesCount: number;
  fromCache?: boolean;
}

interface StackfoldState {
  // Graph & Selection
  rawGraph: ProjectGraph | null;
  layoutedGraph: LayoutedGraph | null;
  selectedNodeId: string | null;
  selectedNode: GraphNode | null;
  hoveredNodeId: string | null;

  // View, Focus & Layout
  activeView: GraphViewType;
  layoutDirection: 'LR' | 'TB';
  density: DensityLevel;
  focusedNodeId: string | null;
  activeInspectorTab: 'details' | 'impact' | 'evidence' | 'ai';
  preferredEditor: PreferredEditor;

  // Filters & Search
  searchQuery: string;
  enabledNodeTypes: Set<NodeType>;

  // Lifecycle, Progress & History
  isLoading: boolean;
  scanProgressMessage: string | null;
  error: string | null;
  scanStats: ScanStats | null;
  currentRootPath: string | null;
  recentProjects: RecentProjectEntry[];

  // Overlays
  isCommandPaletteOpen: boolean;
  isDiagnosticsDrawerOpen: boolean;
  isOnboardingModalOpen: boolean;

  // Actions
  scan: (params: { rootPath?: string; fixture?: string; useCache?: boolean }) => Promise<void>;
  cancelScan: () => void;
  clearGraph: () => void;
  openNativeFolderPicker: () => Promise<string | null>;
  openSelectedFileInEditor: (filePath: string) => Promise<void>;
  setPreferredEditor: (editor: PreferredEditor) => void;
  setActiveView: (view: GraphViewType) => void;
  setLayoutDirection: (dir: 'LR' | 'TB') => void;
  setDensity: (density: DensityLevel) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  focusSubgraph: (nodeId: string | null) => void;
  resetFocus: () => void;
  toggleNodeType: (type: NodeType) => void;
  resetNodeTypeFilters: () => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDiagnosticsDrawerOpen: (open: boolean) => void;
  setOnboardingModalOpen: (open: boolean) => void;
  setActiveInspectorTab: (tab: 'details' | 'impact' | 'evidence' | 'ai') => void;
  loadRecentProjects: () => Promise<void>;
  removeRecentProject: (pathOrId: string) => Promise<void>;
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

let activeScanAbortController: AbortController | null = null;
let currentScanSequence = 0;

export const useStackfoldStore = create<StackfoldState>((set, get) => ({
  rawGraph: null,
  layoutedGraph: null,
  selectedNodeId: null,
  selectedNode: null,
  hoveredNodeId: null,

  activeView: 'architecture',
  layoutDirection: 'LR',
  density: 'standard',
  focusedNodeId: null,
  activeInspectorTab: 'details',
  preferredEditor: 'vscode',

  searchQuery: '',
  enabledNodeTypes: new Set(ALL_NODE_TYPES),

  isLoading: false,
  scanProgressMessage: null,
  error: null,
  scanStats: null,
  currentRootPath: null,
  recentProjects: [],

  isCommandPaletteOpen: false,
  isDiagnosticsDrawerOpen: false,
  isOnboardingModalOpen: false,

  loadRecentProjects: async () => {
    try {
      const adapter = getPlatformAdapter();
      const recents = await adapter.listRecentProjects();
      set({ recentProjects: recents });
    } catch {
      // Ignore
    }
  },

  removeRecentProject: async pathOrId => {
    try {
      const adapter = getPlatformAdapter();
      await adapter.removeRecentProject(pathOrId);
      const recents = await adapter.listRecentProjects();
      set({ recentProjects: recents });
    } catch {
      // Ignore
    }
  },

  openNativeFolderPicker: async () => {
    try {
      const adapter = getPlatformAdapter();
      return await adapter.selectRepositoryFolder();
    } catch {
      return null;
    }
  },

  openSelectedFileInEditor: async (filePath: string) => {
    const { rawGraph, preferredEditor } = get();
    if (!rawGraph?.metadata.rootPath) return;
    const adapter = getPlatformAdapter();
    await adapter.openInEditor(filePath, rawGraph.metadata.rootPath, preferredEditor);
  },

  setPreferredEditor: editor => {
    set({ preferredEditor: editor });
  },

  clearGraph: () => {
    const adapter = getPlatformAdapter();
    adapter.setWindowTitle('Stackfold — Visual Control Center');
    set({
      rawGraph: null,
      layoutedGraph: null,
      selectedNodeId: null,
      selectedNode: null,
      focusedNodeId: null,
      currentRootPath: null,
      error: null,
    });
  },

  cancelScan: () => {
    if (activeScanAbortController) {
      activeScanAbortController.abort();
      activeScanAbortController = null;
    }
    const adapter = getPlatformAdapter();
    adapter.cancelScan();
    set({ isLoading: false, scanProgressMessage: null });
  },

  scan: async params => {
    const scanSequence = ++currentScanSequence;
    const adapter = getPlatformAdapter();

    if (activeScanAbortController) {
      activeScanAbortController.abort();
    }
    activeScanAbortController = new AbortController();

    set({
      isLoading: true,
      error: null,
      scanProgressMessage: 'Initializing scan...',
      isOnboardingModalOpen: false,
    });

    try {
      const result = await adapter.scanRepository(
        params,
        progress => {
          if (scanSequence === currentScanSequence) {
            set({ scanProgressMessage: `${progress.message}` });
          }
        },
        activeScanAbortController.signal
      );

      // Discard if a newer scan was started
      if (scanSequence !== currentScanSequence) {
        return;
      }

      const graph = result.graph;
      const targetPath =
        result.canonicalPath ||
        params.rootPath ||
        (params.fixture ? `[Fixture] ${params.fixture}` : 'Repository');
      const projectName = graph.metadata.projectName || 'Project';

      // Update Native Window Title
      await adapter.setWindowTitle(`Stackfold — ${projectName}`);

      // Save to recent projects
      const newEntry: RecentProjectEntry = {
        path: targetPath,
        name: projectName,
        lastScanned: new Date().toISOString(),
        nodeCount: graph.metadata.stats.nodeCount,
        isFixture: !!params.fixture,
        fixtureId: params.fixture,
      };

      await adapter.saveRecentProject(newEntry);
      const updatedRecent = await adapter.listRecentProjects();

      set({
        rawGraph: graph,
        currentRootPath: targetPath,
        scanStats: {
          durationMs: result.durationMs,
          scannedFilesCount: result.scannedFilesCount,
          fromCache: result.fromCache,
        },
        recentProjects: updatedRecent,
        isLoading: false,
        scanProgressMessage: null,
        selectedNodeId: null,
        selectedNode: null,
        focusedNodeId: null,
      });

      get().recomputeLayout();
    } catch (err: unknown) {
      if (scanSequence !== currentScanSequence) return;
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : (err as { message?: string })?.message || (err ? String(err) : 'Scan failed');
      if (msg === 'The user aborted a request.' || msg === 'Scan aborted by user') {
        set({ isLoading: false, scanProgressMessage: null });
      } else {
        set({ error: msg, isLoading: false, scanProgressMessage: null });
      }
    } finally {
      activeScanAbortController = null;
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

  setDensity: density => {
    set({ density });
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

  focusSubgraph: nodeId => {
    set({ focusedNodeId: nodeId });
    get().recomputeLayout();
  },

  resetFocus: () => {
    set({ focusedNodeId: null });
    get().recomputeLayout();
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
    set({ enabledNodeTypes: new Set(ALL_NODE_TYPES), searchQuery: '', focusedNodeId: null });
    get().recomputeLayout();
  },

  setSearchQuery: query => {
    set({ searchQuery: query });
    get().recomputeLayout();
  },

  setCommandPaletteOpen: open => set({ isCommandPaletteOpen: open }),
  setDiagnosticsDrawerOpen: open => set({ isDiagnosticsDrawerOpen: open }),
  setOnboardingModalOpen: open => set({ isOnboardingModalOpen: open }),
  setActiveInspectorTab: tab => set({ activeInspectorTab: tab }),

  recomputeLayout: () => {
    const {
      rawGraph,
      activeView,
      layoutDirection,
      enabledNodeTypes,
      searchQuery,
      focusedNodeId,
      density,
    } = get();

    if (!rawGraph) {
      set({ layoutedGraph: null });
      return;
    }

    // 1. Extract base view graph
    const viewGraph = extractViewGraph(rawGraph, activeView);

    // 2. Apply filters (Density + Focused Subgraph + Node Types + Search)
    const filtered = filterGraph(
      { ...rawGraph, nodes: viewGraph.nodes, edges: viewGraph.edges },
      {
        density,
        focusNodeId: focusedNodeId || undefined,
        focusDepth: 1,
        nodeTypes: Array.from(enabledNodeTypes),
        searchQuery: searchQuery.trim() || undefined,
      }
    );

    // 3. Compute layout coordinates
    const layout = computeGraphLayout(filtered.nodes, filtered.edges, {
      direction: layoutDirection,
      viewType: activeView,
    });

    set({ layoutedGraph: layout });
  },
}));
