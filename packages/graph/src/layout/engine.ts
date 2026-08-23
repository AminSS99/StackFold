import dagre from '@dagrejs/dagre';
import type {
  GraphNode,
  GraphEdge,
  LayoutedGraph,
  LayoutedNode,
  GraphViewType,
  NodeType,
} from '../types';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing?: number;
  rankSpacing?: number;
  viewType?: GraphViewType;
}

export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  repository: { width: 280, height: 100 },
  application: { width: 260, height: 90 },
  package: { width: 240, height: 80 },
  directory: { width: 220, height: 70 },
  source_module: { width: 240, height: 75 },
  component: { width: 220, height: 70 },
  api_route: { width: 270, height: 95 },
  function: { width: 200, height: 65 },
  database_model: { width: 260, height: 120 },
  environment_variable: { width: 230, height: 65 },
  external_service: { width: 240, height: 85 },
};

export function computeGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions = {}
): LayoutedGraph {
  const direction = options.direction || 'LR';
  const nodeSpacing = options.nodeSpacing ?? 50;
  const rankSpacing = options.rankSpacing ?? 80;
  const viewType = options.viewType || 'architecture';

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeMap = new Map<string, GraphNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    const dims = NODE_DIMENSIONS[node.type] || { width: 220, height: 80 };
    g.setNode(node.id, {
      width: dims.width,
      height: dims.height,
    });
  }

  for (const edge of edges) {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  let maxX = 0;
  let maxY = 0;

  const layoutedNodes: LayoutedNode[] = nodes.map(node => {
    const dagreNode = g.node(node.id);
    const dims = NODE_DIMENSIONS[node.type] || { width: 220, height: 80 };

    const x = dagreNode ? dagreNode.x - dims.width / 2 : 0;
    const y = dagreNode ? dagreNode.y - dims.height / 2 : 0;

    if (x + dims.width > maxX) maxX = x + dims.width;
    if (y + dims.height > maxY) maxY = y + dims.height;

    return {
      ...node,
      position: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) },
      width: dims.width,
      height: dims.height,
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
    viewType,
    dimensions: {
      width: Math.max(800, Math.round(maxX + 80)),
      height: Math.max(600, Math.round(maxY + 80)),
    },
  };
}
