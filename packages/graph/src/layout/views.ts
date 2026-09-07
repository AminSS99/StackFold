import type {
  ProjectGraph,
  GraphNode,
  GraphEdge,
  GraphViewType,
  NodeType,
  EdgeType,
} from '../types';

export interface ViewFilterDefinition {
  allowedNodeTypes: NodeType[];
  allowedEdgeTypes?: EdgeType[];
  description: string;
}

export const VIEW_DEFINITIONS: Record<GraphViewType, ViewFilterDefinition> = {
  architecture: {
    allowedNodeTypes: [
      'application',
      'package',
      'api_route',
      'database_model',
      'external_service',
      'environment_variable',
      'source_module',
      'component',
    ],
    description: 'System-level architecture showing applications, services, APIs, databases, and configuration.',
  },
  api_flow: {
    allowedNodeTypes: [
      'application',
      'api_route',
      'source_module',
      'function',
      'database_model',
      'external_service',
    ],
    allowedEdgeTypes: ['exposes', 'calls', 'reads', 'writes', 'communicates_with', 'imports'],
    description: 'API routes and their downstream flows through services, database models, and external APIs.',
  },
  database: {
    allowedNodeTypes: ['database_model', 'api_route', 'source_module'],
    allowedEdgeTypes: ['reads', 'writes', 'contains', 'imports'],
    description: 'Database entity-relationship diagram and the routes/modules that interact with them.',
  },
  dependencies: {
    allowedNodeTypes: ['application', 'package', 'source_module', 'external_service'],
    allowedEdgeTypes: ['depends_on', 'imports', 'contains'],
    description: 'Monorepo workspace packages, source modules, and third-party dependencies.',
  },
};

export function extractViewGraph(
  graph: ProjectGraph,
  viewType: GraphViewType
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const def = VIEW_DEFINITIONS[viewType];
  const allowedNodeSet = new Set(def.allowedNodeTypes);
  const allowedEdgeSet = def.allowedEdgeTypes ? new Set(def.allowedEdgeTypes) : null;

  const nodes = graph.nodes.filter(n => allowedNodeSet.has(n.type));
  const nodeIds = new Set(nodes.map(n => n.id));

  const edges = graph.edges.filter(e => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
    if (allowedEdgeSet && !allowedEdgeSet.has(e.type)) return false;
    return true;
  });

  return { nodes, edges };
}
