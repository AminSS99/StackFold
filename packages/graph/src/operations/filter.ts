import type {
  ProjectGraph,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
} from '../types';

export type DensityLevel = 'overview' | 'standard' | 'detailed';

export interface GraphFilterOptions {
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  tags?: string[];
  searchQuery?: string;
  focusNodeId?: string;
  focusDepth?: number;
  density?: DensityLevel;
}

export function filterGraph(graph: ProjectGraph, options: GraphFilterOptions): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isFocused?: boolean;
} {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];
  let isFocused = false;

  // 1. Density Level of Detail (LOD)
  // 'overview': Hide low-level source_module and component nodes to prevent visual clutter
  if (options.density === 'overview') {
    const coarseTypes = new Set<NodeType>([
      'application',
      'package',
      'api_route',
      'database_model',
      'external_service',
      'environment_variable',
    ]);
    nodes = nodes.filter(n => coarseTypes.has(n.type));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  } else if (options.density === 'standard') {
    // Hide isolated source_modules that have no exports/functions
    nodes = nodes.filter(n => {
      if (n.type === 'source_module') {
        const hasExports = (n.metadata?.exports as string[])?.length > 0;
        const hasFunctions = (n.metadata?.functions as string[])?.length > 0;
        return hasExports || hasFunctions || n.tags.includes('entry');
      }
      return true;
    });
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  // 2. Filter by focus node and depth
  if (options.focusNodeId) {
    const reachableNodeIds = new Set<string>([options.focusNodeId]);
    const maxDepth = options.focusDepth ?? 1;

    let currentLayer = new Set<string>([options.focusNodeId]);

    for (let depth = 0; depth < maxDepth; depth++) {
      const nextLayer = new Set<string>();
      for (const edge of graph.edges) {
        if (currentLayer.has(edge.source)) {
          reachableNodeIds.add(edge.target);
          nextLayer.add(edge.target);
        }
        if (currentLayer.has(edge.target)) {
          reachableNodeIds.add(edge.source);
          nextLayer.add(edge.source);
        }
      }
      currentLayer = nextLayer;
    }

    nodes = nodes.filter(n => reachableNodeIds.has(n.id));
    edges = edges.filter(e => reachableNodeIds.has(e.source) && reachableNodeIds.has(e.target));
    isFocused = true;
  }

  // 3. Filter by Node Types
  if (options.nodeTypes && options.nodeTypes.length > 0) {
    const allowed = new Set(options.nodeTypes);
    nodes = nodes.filter(n => allowed.has(n.type));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  // 4. Filter by Edge Types
  if (options.edgeTypes && options.edgeTypes.length > 0) {
    const allowed = new Set(options.edgeTypes);
    edges = edges.filter(e => allowed.has(e.type));
  }

  // 5. Filter by Search Query
  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    const q = options.searchQuery.toLowerCase().trim();
    const matchingNodeIds = new Set(
      nodes
        .filter(
          n =>
            n.displayName.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q) ||
            n.filePath?.toLowerCase().includes(q) ||
            n.tags.some(t => t.toLowerCase().includes(q))
        )
        .map(n => n.id)
    );

    const contextNodeIds = new Set(matchingNodeIds);
    for (const edge of edges) {
      if (matchingNodeIds.has(edge.source)) contextNodeIds.add(edge.target);
      if (matchingNodeIds.has(edge.target)) contextNodeIds.add(edge.source);
    }

    nodes = nodes.filter(n => contextNodeIds.has(n.id));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  // 6. Filter by tags
  if (options.tags && options.tags.length > 0) {
    const allowedTags = new Set(options.tags);
    nodes = nodes.filter(n => n.tags.some(t => allowedTags.has(t)));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  return { nodes, edges, isFocused };
}

export function extractFocusedSubgraph(
  graph: ProjectGraph,
  targetNodeId: string,
  depth = 1
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNode?: GraphNode;
} {
  const result = filterGraph(graph, { focusNodeId: targetNodeId, focusDepth: depth });
  const centerNode = graph.nodes.find(n => n.id === targetNodeId);
  return {
    nodes: result.nodes,
    edges: result.edges,
    centerNode,
  };
}
