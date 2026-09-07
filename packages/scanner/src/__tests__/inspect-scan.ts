import { scanRepository } from '../index';
import path from 'node:path';

async function testScan() {
  const stackfoldRoot = process.cwd();
  console.log('Scanning Stackfold root:', stackfoldRoot);

  const result = await scanRepository({
    rootPath: stackfoldRoot,
    projectName: 'Stackfold Monorepo',
    useCache: false,
  });

  console.log('--- Scan Summary ---');
  console.log('Project Name:', result.graph.metadata.projectName);
  console.log('Total Nodes:', result.graph.nodes.length);
  console.log('Total Edges:', result.graph.edges.length);
  console.log('Diagnostics:', result.diagnostics.length);
  console.log('Scanned Files Count:', result.scannedFilesCount);
  console.log('Duration:', result.durationMs, 'ms');

  // Breakdown by node type
  const nodeTypes: Record<string, number> = {};
  for (const n of result.graph.nodes) {
    nodeTypes[n.type] = (nodeTypes[n.type] || 0) + 1;
  }
  console.log('Node types:', nodeTypes);

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  const duplicates: string[] = [];
  for (const n of result.graph.nodes) {
    if (nodeIds.has(n.id)) {
      duplicates.push(n.id);
    }
    nodeIds.add(n.id);
  }
  console.log('Duplicate nodes:', duplicates);

  // Check for dangling edges
  const dangling: string[] = [];
  for (const e of result.graph.edges) {
    if (!nodeIds.has(e.source)) {
      dangling.push(`Missing source: ${e.source} on edge ${e.id}`);
    }
    if (!nodeIds.has(e.target)) {
      dangling.push(`Missing target: ${e.target} on edge ${e.id}`);
    }
  }
  console.log('Dangling edges count:', dangling.length);
  if (dangling.length > 0) {
    console.log('Sample dangling edges:', dangling.slice(0, 5));
  }

  // Check diagnostics
  if (result.diagnostics.length > 0) {
    console.log('Sample diagnostics:', result.diagnostics.slice(0, 5));
  }
}

testScan().catch(err => {
  console.error('Scan failed:', err);
  process.exit(1);
});
