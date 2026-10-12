import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatFindings, scanRepository } from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../../../../fixtures/tx-escape-prisma');

describe('TxEscape guardrail', () => {
  it('traces an imported helper from a Prisma transaction to a confirmed email side effect', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const finding = graph.findings.find(item =>
      item.ruleId === 'guardrails/tx-escape/external-side-effect-in-transaction'
    );

    expect(finding?.status).toBe('confirmed');
    expect(finding?.severity).toBe('high');
    expect(finding?.sourceLocation.filePath).toBe('src/checkout.ts');
    expect(finding?.affectedNodeIds).toContain('source_module:src/checkout.ts');
    expect(finding?.affectedNodeIds).toContain('source_module:src/notifications.ts');
    expect(finding?.affectedNodeIds).toContain('external_service:Resend');
    expect(finding?.evidence.some(item => item.codeSnippet?.includes('sendReceipt'))).toBe(true);
    expect(finding?.evidence.some(item => item.codeSnippet?.includes('resend.emails.send'))).toBe(true);
    expect(finding?.explanation).toContain('roll back');
    expect(finding?.suggestedAction).toContain('outbox');
    expect(finding?.metadata?.traceDepth).toBe(1);

    const boundary = graph.nodes.find(node => node.type === 'risk_boundary');
    expect(boundary).toBeDefined();
    expect(graph.edges.some(edge =>
      edge.source === 'source_module:src/checkout.ts' &&
      edge.target === boundary?.id &&
      edge.type === 'violates'
    )).toBe(true);
    expect(graph.edges.some(edge =>
      edge.source === boundary?.id &&
      edge.target === 'source_module:src/notifications.ts' &&
      edge.type === 'traces_to'
    )).toBe(true);

    expect(formatFindings([finding!], 'github-actions')).toContain('tx-escape');
  });

  it('does not flag ordinary database work without a confirmed external side effect', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const txFindings = graph.findings.filter(item => item.ruleId.includes('tx-escape'));
    expect(txFindings).toHaveLength(1);
  });
});
