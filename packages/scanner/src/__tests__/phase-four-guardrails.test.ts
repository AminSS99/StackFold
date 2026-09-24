import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatFindings, scanRepository } from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../../../../fixtures/scopepatch-idtrace');

describe('Phase 4 architecture guardrails', () => {
  it('correlates GitHub REST calls with additive GitHub App permission patches', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('scope-patch'));

    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.status).toBe('confirmed');
    expect(finding.severity).toBe('high');
    expect(finding.sourceLocation.filePath).toBe('src/github.ts');
    expect(finding.title).toContain('issues.create');
    expect(finding.evidence.some(item => item.codeSnippet?.includes('github.rest.issues.create'))).toBe(true);
    expect(finding.suggestedAction).toContain('"issues":"write"');
    expect(finding.metadata?.additivePatch).toEqual({
      op: 'add',
      path: '/permissions/issues',
      value: 'write',
    });
    expect(finding.metadata?.removesPermissions).toBe(false);

    const operation = graph.nodes.find(node => node.type === 'api_operation' && node.displayName === 'issues.create');
    const permission = graph.nodes.find(node => node.type === 'permission_scope' && node.metadata.permission === 'issues');
    expect(operation).toBeDefined();
    expect(permission?.metadata.declaredLevel).toBe('missing');
    expect(graph.edges.some(edge => edge.source === operation?.id && edge.target === permission?.id && edge.type === 'requires')).toBe(true);
    expect(graph.findings.some(item => item.title.includes('graphql'))).toBe(false);
    expect(formatFindings(findings, 'github-actions')).toContain('scope-patch');
  });

  it('flags only type-proven unsupported identity crossings', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('id-trace'));

    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.status).toBe('confirmed');
    expect(finding.sourceLocation.filePath).toBe('src/identity.ts');
    expect(finding.evidence.some(item => item.codeSnippet === 'loadDatabaseUser(id)')).toBe(true);
    expect(finding.explanation).toContain('TypeScript annotations');
    expect(finding.metadata?.inferredFromVariableNames).toBe(false);
    expect(finding.affectedNodeIds).toContain('identity_domain:github-user');
    expect(finding.affectedNodeIds).toContain('identity_domain:database-user');

    const identityNodes = graph.nodes.filter(node => node.type === 'identity_domain');
    expect(identityNodes).toHaveLength(3);
    expect(graph.edges.some(edge =>
      edge.source === 'identity_domain:github-user' &&
      edge.target === 'identity_domain:database-user' &&
      edge.type === 'crosses' &&
      edge.metadata?.supported === true
    )).toBe(true);
    expect(formatFindings(findings, 'terminal')).toContain('IDTrace');
  });
});
