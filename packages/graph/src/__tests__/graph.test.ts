import { describe, it, expect } from 'vitest';
import {
  GraphBuilder,
  calculateChangeImpact,
  detectCycles,
  filterGraph,
  extractViewGraph,
  extractFocusedSubgraph,
  computeGraphLayout,
} from '../index';

describe('GraphBuilder', () => {
  it('creates nodes and edges with deterministic IDs', () => {
    const builder = new GraphBuilder();

    const appNode = builder.createAndAddNode({
      type: 'application',
      key: 'apps/web',
      displayName: 'Web App',
      filePath: 'apps/web/package.json',
      evidence: {
        detectorId: 'workspace-detector',
        rule: 'workspace-package',
        filePath: 'apps/web/package.json',
      },
    });

    const routeNode = builder.createAndAddNode({
      type: 'api_route',
      key: 'apps/web/app/api/checkout:POST',
      displayName: 'POST /api/checkout',
      filePath: 'apps/web/app/api/checkout/route.ts',
      evidence: {
        detectorId: 'nextjs-detector',
        rule: 'app-router-route',
        filePath: 'apps/web/app/api/checkout/route.ts',
      },
    });

    const edge = builder.createAndAddEdge({
      source: appNode.id,
      target: routeNode.id,
      type: 'exposes',
      evidence: {
        detectorId: 'nextjs-detector',
        rule: 'app-exposes-route',
      },
    });

    expect(appNode.id).toBe('application:apps/web');
    expect(routeNode.id).toBe('api_route:apps/web/app/api/checkout:POST');
    expect(edge?.id).toBe('edge:application:apps/web->api_route:apps/web/app/api/checkout:POST:exposes');

    const graph = builder.build({
      rootPath: '/test/repo',
      projectName: 'test-project',
      frameworks: ['nextjs', 'prisma'],
    });

    expect(graph.metadata.stats.nodeCount).toBe(2);
    expect(graph.metadata.stats.edgeCount).toBe(1);
    expect(graph.metadata.stats.nodeTypeCounts.application).toBe(1);
    expect(graph.metadata.stats.nodeTypeCounts.api_route).toBe(1);
    expect(graph.metadata.stats.edgeTypeCounts.exposes).toBe(1);
  });

  it('detects dangling edge references and reports diagnostics', () => {
    const builder = new GraphBuilder();

    builder.createAndAddNode({
      type: 'application',
      key: 'apps/web',
      displayName: 'Web App',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    builder.createAndAddEdge({
      source: 'application:apps/web',
      target: 'api_route:non-existent',
      type: 'exposes',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    const graph = builder.build({
      rootPath: '/test',
      projectName: 'test',
      frameworks: [],
    });

    expect(graph.edges.length).toBe(0);
    expect(graph.diagnostics.length).toBe(1);
    expect(graph.diagnostics[0]?.code).toBe('DANGLING_EDGE_REF');
  });
});

describe('Change Impact Analysis', () => {
  it('calculates blast radius across direct and transitive dependencies', () => {
    const builder = new GraphBuilder();

    const dbModel = builder.createAndAddNode({
      type: 'database_model',
      key: 'Order',
      displayName: 'Order',
      evidence: { detectorId: 'prisma', rule: 'model' },
    });

    const utilModule = builder.createAndAddNode({
      type: 'source_module',
      key: 'lib/orders.ts',
      displayName: 'lib/orders.ts',
      evidence: { detectorId: 'ts', rule: 'module' },
    });

    const routeNode = builder.createAndAddNode({
      type: 'api_route',
      key: 'app/api/orders/route.ts:POST',
      displayName: 'POST /api/orders',
      evidence: { detectorId: 'nextjs', rule: 'route' },
    });

    const pageComponent = builder.createAndAddNode({
      type: 'component',
      key: 'app/orders/page.tsx',
      displayName: 'OrdersPage',
      evidence: { detectorId: 'nextjs', rule: 'page' },
    });

    builder.createAndAddEdge({
      source: utilModule.id,
      target: dbModel.id,
      type: 'reads',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    builder.createAndAddEdge({
      source: routeNode.id,
      target: utilModule.id,
      type: 'calls',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    builder.createAndAddEdge({
      source: pageComponent.id,
      target: routeNode.id,
      type: 'calls',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    const graph = builder.build({
      rootPath: '/test',
      projectName: 'test',
      frameworks: [],
    });

    const impact = calculateChangeImpact(graph, dbModel.id);

    expect(impact.directDependents.length).toBe(1);
    expect(impact.directDependents[0]?.id).toBe(utilModule.id);

    expect(impact.transitiveDependents.length).toBe(2);
    const affectedIds = impact.transitiveDependents.map(d => d.id);
    expect(affectedIds).toContain(routeNode.id);
    expect(affectedIds).toContain(pageComponent.id);

    expect(impact.affectedApiRoutes.length).toBe(1);
    expect(impact.affectedComponents.length).toBe(1);
    expect(impact.severity).toBe('CRITICAL');
  });
});

describe('Cycle Detection', () => {
  it('identifies circular dependencies between modules', () => {
    const builder = new GraphBuilder();

    const modA = builder.createAndAddNode({
      type: 'source_module',
      key: 'lib/a.ts',
      displayName: 'a.ts',
      evidence: { detectorId: 'test', rule: 'test' },
    });
    const modB = builder.createAndAddNode({
      type: 'source_module',
      key: 'lib/b.ts',
      displayName: 'b.ts',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    builder.createAndAddEdge({
      source: modA.id,
      target: modB.id,
      type: 'imports',
      evidence: { detectorId: 'test', rule: 'test' },
    });
    builder.createAndAddEdge({
      source: modB.id,
      target: modA.id,
      type: 'imports',
      evidence: { detectorId: 'test', rule: 'test' },
    });

    const graph = builder.build({
      rootPath: '/test',
      projectName: 'test',
      frameworks: [],
    });

    const result = detectCycles(graph, ['imports']);
    expect(result.hasCycles).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
  });
});

describe('Focused Subgraph Isolation & Density Filters', () => {
  it('isolates subgraph centered around a target node', () => {
    const builder = new GraphBuilder();

    const n1 = builder.createAndAddNode({ type: 'application', key: 'app1', displayName: 'App 1', evidence: { detectorId: 't', rule: 't' } });
    const n2 = builder.createAndAddNode({ type: 'api_route', key: 'r1', displayName: 'Route 1', evidence: { detectorId: 't', rule: 't' } });
    const n3 = builder.createAndAddNode({ type: 'database_model', key: 'm1', displayName: 'Model 1', evidence: { detectorId: 't', rule: 't' } });
    const nUnrelated = builder.createAndAddNode({ type: 'database_model', key: 'mOther', displayName: 'Other', evidence: { detectorId: 't', rule: 't' } });

    builder.createAndAddEdge({ source: n1.id, target: n2.id, type: 'exposes', evidence: { detectorId: 't', rule: 't' } });
    builder.createAndAddEdge({ source: n2.id, target: n3.id, type: 'reads', evidence: { detectorId: 't', rule: 't' } });

    const graph = builder.build({ rootPath: '/test', projectName: 'test' });

    const isolated = extractFocusedSubgraph(graph, n2.id, 1);
    expect(isolated.nodes.length).toBe(3);
    const isolatedIds = isolated.nodes.map(n => n.id);
    expect(isolatedIds).toContain(n1.id);
    expect(isolatedIds).toContain(n2.id);
    expect(isolatedIds).toContain(n3.id);
    expect(isolatedIds).not.toContain(nUnrelated.id);
  });

  it('filters out source modules when density is set to overview', () => {
    const builder = new GraphBuilder();

    const app = builder.createAndAddNode({ type: 'application', key: 'app', displayName: 'App', evidence: { detectorId: 't', rule: 't' } });
    const mod = builder.createAndAddNode({ type: 'source_module', key: 'mod', displayName: 'Module', evidence: { detectorId: 't', rule: 't' } });
    builder.createAndAddEdge({ source: app.id, target: mod.id, type: 'contains', evidence: { detectorId: 't', rule: 't' } });

    const graph = builder.build({ rootPath: '/test', projectName: 'test' });

    const overview = filterGraph(graph, { density: 'overview' });
    expect(overview.nodes.length).toBe(1);
    expect(overview.nodes[0]?.type).toBe('application');
  });
});
