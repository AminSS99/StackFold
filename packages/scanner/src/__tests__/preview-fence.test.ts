import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatFindings, parsePreviewFenceConfig, scanRepository } from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../../../../fixtures/preview-fence-vercel-supabase');

describe('PreviewFence Vercel + Supabase vertical slice', () => {
  it('parses only the supported safe-identifier manifest', () => {
    const config = parsePreviewFenceConfig(JSON.stringify({
      schemaVersion: 1,
      environments: [{
        provider: 'vercel',
        name: 'preview',
        kind: 'preview',
        projectId: 'project-id',
        resources: [{
          provider: 'supabase',
          type: 'project',
          identifier: 'resource-id',
          binding: 'NEXT_PUBLIC_SUPABASE_URL',
        }],
      }],
    }));
    expect(config.environments[0]?.resources[0]?.classification).toBe('unknown');
  });

  it('creates a confirmed finding and graph boundary without retaining provider identifiers', async () => {
    const result = await scanRepository({ rootPath: fixturePath, useCache: false });
    const finding = result.graph.findings.find(item =>
      item.ruleId === 'preview-fence/vercel-supabase-production-boundary'
    );

    expect(finding).toBeDefined();
    expect(finding?.status).toBe('confirmed');
    expect(finding?.severity).toBe('high');
    expect(finding?.affectedNodeIds).toHaveLength(2);
    expect(finding?.sourceLocation.filePath).toBe('.stackfold/preview-fence.json');
    expect(finding?.evidence.length).toBeGreaterThanOrEqual(2);
    expect(finding?.explanation).toContain('production Vercel environment');
    expect(finding?.suggestedAction).toContain('non-production Supabase project');

    const environments = result.graph.nodes.filter(node => node.type === 'deployment_environment');
    const resources = result.graph.nodes.filter(node => node.type === 'cloud_resource');
    const bindings = result.graph.edges.filter(edge => edge.type === 'binds_to');
    expect(environments).toHaveLength(3);
    expect(resources).toHaveLength(2);
    expect(bindings).toHaveLength(3);

    const serialized = JSON.stringify(result.graph);
    expect(serialized).not.toContain('production-project-ref');
    expect(serialized).not.toContain('development-project-ref');
    expect(serialized).toContain('identifierFingerprint');
  });

  it('formats terminal, structured JSON, GitHub Actions, and CircleCI reports', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const terminal = formatFindings(graph.findings, 'terminal');
    const json = JSON.parse(formatFindings(graph.findings, 'json'));
    const github = formatFindings(graph.findings, 'github-actions');
    const circle = formatFindings(graph.findings, 'circleci');

    expect(terminal).toContain('PreviewFence');
    expect(json.summary.confirmed).toBe(1);
    expect(github).toContain('::warning file=.stackfold/preview-fence.json');
    expect(circle).toContain('HIGH [preview-fence/vercel-supabase-production-boundary]');
  });
});
