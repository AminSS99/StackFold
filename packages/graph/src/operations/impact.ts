import type {
  ProjectGraph,
  ChangeImpactResult,
  ImpactNodeSummary,
  GraphNode,
  GraphEdge,
} from '../types';

export function calculateChangeImpact(
  graph: ProjectGraph,
  targetNodeId: string,
  maxDepth = 5
): ChangeImpactResult {
  const nodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.id, n]));
  const targetNode = nodeMap.get(targetNodeId);

  const incomingEdges = new Map<string, GraphEdge[]>();
  const outgoingEdges = new Map<string, GraphEdge[]>();

  for (const edge of graph.edges) {
    if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
    incomingEdges.get(edge.target)!.push(edge);

    if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
    outgoingEdges.get(edge.source)!.push(edge);
  }

  const directDependencies: ImpactNodeSummary[] = [];
  const outEdges = outgoingEdges.get(targetNodeId) || [];
  for (const edge of outEdges) {
    const node = nodeMap.get(edge.target);
    if (node) {
      directDependencies.push({
        id: node.id,
        type: node.type,
        displayName: node.displayName,
        filePath: node.filePath,
        depth: 1,
        reason: `Target node ${edge.type} ${node.displayName}`,
        relationship: edge.type,
      });
    }
  }

  const directDependents: ImpactNodeSummary[] = [];
  const transitiveDependents: ImpactNodeSummary[] = [];
  const visited = new Set<string>([targetNodeId]);

  interface QueueItem {
    nodeId: string;
    depth: number;
    parentEdgeType: GraphEdge['type'];
  }

  const queue: QueueItem[] = [];
  const inEdges = incomingEdges.get(targetNodeId) || [];
  for (const edge of inEdges) {
    queue.push({ nodeId: edge.source, depth: 1, parentEdgeType: edge.type });
  }

  while (queue.length > 0) {
    const { nodeId, depth, parentEdgeType } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const summary: ImpactNodeSummary = {
      id: node.id,
      type: node.type,
      displayName: node.displayName,
      filePath: node.filePath,
      depth,
      reason:
        depth === 1
          ? `Directly ${parentEdgeType} modified node`
          : `Transitively affected at depth ${depth} via ${parentEdgeType}`,
      relationship: parentEdgeType,
    };

    if (depth === 1) {
      directDependents.push(summary);
    } else {
      transitiveDependents.push(summary);
    }

    if (depth < maxDepth) {
      const nextInEdges = incomingEdges.get(nodeId) || [];
      for (const nextEdge of nextInEdges) {
        if (!visited.has(nextEdge.source)) {
          queue.push({
            nodeId: nextEdge.source,
            depth: depth + 1,
            parentEdgeType: nextEdge.type,
          });
        }
      }
    }
  }

  const allImpacted = [...directDependents, ...transitiveDependents];
  const affectedApiRoutes = allImpacted.filter(n => n.type === 'api_route');
  const affectedDatabaseModels = allImpacted.filter(n => n.type === 'database_model');
  const affectedComponents = allImpacted.filter(n => n.type === 'component');

  const totalAffectedNodes = allImpacted.length;

  let severity: ChangeImpactResult['severity'] = 'LOW';
  if (affectedApiRoutes.length > 0 || affectedDatabaseModels.length > 0 || totalAffectedNodes > 10) {
    severity = 'CRITICAL';
  } else if (totalAffectedNodes > 4) {
    severity = 'HIGH';
  } else if (totalAffectedNodes > 1) {
    severity = 'MEDIUM';
  }

  return {
    targetNodeId,
    targetNode,
    directDependents,
    transitiveDependents,
    directDependencies,
    affectedApiRoutes,
    affectedDatabaseModels,
    affectedComponents,
    totalAffectedNodes,
    severity,
  };
}
