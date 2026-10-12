import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatFindings, parseDriftImpactConfig, scanRepository } from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../../../../fixtures/sample-ecommerce-app');

describe('Drift Impact foundation', () => {
  it('accepts manual and changelog change descriptions with migration steps', () => {
    const config = parseDriftImpactConfig(JSON.stringify({
      schemaVersion: 1,
      changes: [{
        id: 'sdk-change',
        source: { kind: 'manual', name: 'Example SDK' },
        summary: 'Client changed',
        targets: [{ kind: 'package', packageName: 'example', changedSymbols: ['Client'] }],
        migrationSteps: ['Review the client initialization.'],
      }],
    }));
    expect(config.changes[0]?.severity).toBe('medium');
  });

  it('maps changed symbols to imports, files, graph dependents, and evidence', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const confirmed = graph.findings.find(finding =>
      finding.id.endsWith('stripe-sdk-major-18')
    );

    expect(confirmed?.status).toBe('confirmed');
    expect(confirmed?.severity).toBe('high');
    expect(confirmed?.affectedNodeIds).toContain('source_module:lib/stripe.ts');
    expect(confirmed?.affectedNodeIds).toContain('api_route:app/api/checkout/route.ts:POST');
    expect(confirmed?.affectedNodeIds).toContain('api_route:app/api/webhooks/stripe/route.ts:POST');
    expect(confirmed?.evidence.some(item => item.codeSnippet?.includes("from 'stripe'"))).toBe(true);
    expect(confirmed?.suggestedAction).toContain('Review the Stripe client initialization');

    const changeNode = graph.nodes.find(node => node.id === 'change_event:stripe-sdk-major-18');
    expect(changeNode).toBeDefined();
    expect(graph.edges.some(edge =>
      edge.source === changeNode?.id &&
      edge.target === 'source_module:lib/stripe.ts' &&
      edge.type === 'may_impact'
    )).toBe(true);
  });

  it('keeps unresolved symbol correlations explicitly uncertain', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const uncertain = graph.findings.find(finding =>
      finding.id.endsWith('stripe-checkout-session-shape')
    );
    expect(uncertain?.status).toBe('uncertain');
    expect(uncertain?.severity).toBe('medium');
    expect(uncertain?.explanation).toContain('could not prove');
    expect(formatFindings([uncertain!], 'terminal')).toContain('uncertain');
  });
});
