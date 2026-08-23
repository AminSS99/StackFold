import type { ProjectGraph, GraphEdge } from '../types';

export interface CycleResult {
  hasCycles: boolean;
  cycles: string[][];
}

export function detectCycles(graph: ProjectGraph, allowedEdgeTypes?: GraphEdge['type'][]): CycleResult {
  const edgeTypeSet = allowedEdgeTypes ? new Set(allowedEdgeTypes) : null;
  const adj = new Map<string, string[]>();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edgeTypeSet && !edgeTypeSet.has(edge.type)) continue;
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(nodeId: string) {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = stack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push([...stack.slice(cycleStartIndex), neighbor]);
        }
      }
    }

    stack.pop();
    inStack.delete(nodeId);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return {
    hasCycles: cycles.length > 0,
    cycles,
  };
}
