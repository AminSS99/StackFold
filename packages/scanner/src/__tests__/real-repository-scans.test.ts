import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanRepository } from '../index';

describe('Real Repository Scanning & Graph Integrity', () => {
  const rootDir = path.resolve(__dirname, '../../../../');

  it('scans Stackfold monorepo itself deterministically with zero dangling edges', async () => {
    const result = await scanRepository({
      rootPath: rootDir,
      projectName: 'Stackfold Self-Scan',
      useCache: false,
    });

    expect(result.graph.nodes.length).toBeGreaterThan(50);
    expect(result.graph.edges.length).toBeGreaterThan(50);

    const nodeIds = new Set(result.graph.nodes.map(n => n.id));
    expect(nodeIds.size).toBe(result.graph.nodes.length); // Zero duplicates

    for (const edge of result.graph.edges) {
      expect(nodeIds.has(edge.source), `Missing source ${edge.source} on edge ${edge.id}`).toBe(true);
      expect(nodeIds.has(edge.target), `Missing target ${edge.target} on edge ${edge.id}`).toBe(true);
      expect(edge.evidence).toBeDefined();
    }

    // Ensure NO secret values are leaked in env nodes or metadata
    const envNodes = result.graph.nodes.filter(n => n.type === 'environment_variable');
    expect(envNodes.length).toBeGreaterThan(0);
    for (const envNode of envNodes) {
      expect((envNode as unknown as { value?: string }).value).toBeUndefined();
      expect(envNode.metadata).not.toHaveProperty('value');
      expect(envNode.displayName).not.toContain('=');
    }
  });

  it('scans sample-ecommerce-app fixture with correct Prisma and Next.js routes', async () => {
    const fixturePath = path.join(rootDir, 'fixtures/sample-ecommerce-app');
    const result = await scanRepository({
      rootPath: fixturePath,
      projectName: 'Sample E-Commerce',
      useCache: false,
    });

    const routeNodes = result.graph.nodes.filter(n => n.type === 'api_route');
    expect(routeNodes.length).toBeGreaterThanOrEqual(3);
    const routeLabels = routeNodes.map(r => r.displayName);
    expect(routeLabels).toContain('POST /api/checkout');
    expect(routeLabels).toContain('GET /api/products');
    expect(routeLabels).toContain('POST /api/webhooks/stripe');

    const dbNodes = result.graph.nodes.filter(n => n.type === 'database_model');
    expect(dbNodes.length).toBeGreaterThanOrEqual(2);
    const dbLabels = dbNodes.map(d => d.displayName);
    expect(dbLabels).toContain('Product');
    expect(dbLabels).toContain('Order');

    // Check external services
    const extServices = result.graph.nodes.filter(n => n.type === 'external_service');
    const extLabels = extServices.map(s => s.displayName);
    expect(extLabels).toContain('Stripe');
    expect(extLabels).toContain('Resend');
  });

  it('scans sample-monorepo-platform and extracts multiple apps and workspace packages', async () => {
    const fixturePath = path.join(rootDir, 'fixtures/sample-monorepo-platform');
    const result = await scanRepository({
      rootPath: fixturePath,
      projectName: 'Sample Monorepo Platform',
      useCache: false,
    });

    const appNodes = result.graph.nodes.filter(n => n.type === 'application');
    expect(appNodes.length).toBeGreaterThanOrEqual(2);

    const pkgNodes = result.graph.nodes.filter(n => n.type === 'package');
    expect(pkgNodes.length).toBeGreaterThanOrEqual(2);

    // Verify all edges link valid nodes
    const nodeIds = new Set(result.graph.nodes.map(n => n.id));
    for (const edge of result.graph.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
