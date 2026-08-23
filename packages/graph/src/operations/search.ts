import type { ProjectGraph, GraphNode } from '../types';

export interface SearchResultItem {
  node: GraphNode;
  score: number;
  matchField: 'name' | 'path' | 'tag' | 'metadata';
}

export function searchGraphNodes(
  graph: ProjectGraph,
  query: string,
  limit = 20
): SearchResultItem[] {
  if (!query || !query.trim()) {
    return graph.nodes.slice(0, limit).map(node => ({
      node,
      score: 1,
      matchField: 'name',
    }));
  }

  const q = query.toLowerCase().trim();
  const results: SearchResultItem[] = [];

  for (const node of graph.nodes) {
    const name = node.displayName.toLowerCase();
    const path = node.filePath?.toLowerCase() || '';
    const id = node.id.toLowerCase();

    if (name === q || id === q) {
      results.push({ node, score: 100, matchField: 'name' });
    } else if (name.startsWith(q)) {
      results.push({ node, score: 80, matchField: 'name' });
    } else if (name.includes(q)) {
      results.push({ node, score: 60, matchField: 'name' });
    } else if (path.includes(q)) {
      results.push({ node, score: 40, matchField: 'path' });
    } else if (node.tags.some(t => t.toLowerCase().includes(q))) {
      results.push({ node, score: 30, matchField: 'tag' });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
