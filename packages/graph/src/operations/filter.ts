import type {
  ProjectGraph,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
} from '../types';

export interface GraphFilterOptions {
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  tags?: string[];
  searchQuery?: string;
  focusNodeId?: string;
  focusDepth?: number;
}

export function filterGraph(graph: ProjectGraph, options: GraphFilterOptions): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];

  // 1. Filter by focus node and depth if specified
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
  }

  // 2. Filter by Node Types
  if (options.nodeTypes && options.nodeTypes.length > 0) {
    const allowed = new Set(options.nodeTypes);
    nodes = nodes.filter(n => allowed.has(n.type));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  // 3. Filter by Edge Types
  if (options.edgeTypes && options.edgeTypes.length > 0) {
    const allowed = new Set(options.edgeTypes);
    edges = edges.filter(e => allowed.has(e.type));
  }

  // 4. Filter by Search Query
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

    // Keep matching nodes and direct neighbors to preserve readable context
    const contextNodeIds = new Set(matchingNodeIds);
    for (const edge of edges) {
      if (matchingNodeIds.has(edge.source)) contextNodeIds.add(edge.target);
      if (matchingNodeIds.has(edge.target)) contextNodeIds.add(edge.source);
    }

    nodes = nodes.filter(n => contextNodeIds.has(n.id));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  // 5. Filter by tags
  if (options.tags && options.tags.length > 0) {
    const allowedTags = new Set(options.tags);
    nodes = nodes.filter(n => n.tags.some(t => allowedTags.has(t)));
    const activeNodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }

  return { nodes, edges };
}
