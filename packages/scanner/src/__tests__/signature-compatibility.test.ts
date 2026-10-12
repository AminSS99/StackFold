import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  firstDifferingByte,
  formatFindings,
  parseSignatureCompatibilityConfig,
  runSignatureCompatibilityCheck,
  scanRepository,
} from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const vulnerablePath = path.resolve(currentDir, '../../../../fixtures/signature-compatibility-vulnerable');
const passingPath = path.resolve(currentDir, '../../../../fixtures/signature-compatibility-passing');

const SYNTHETIC_SECRET = 'sig-synthetic-test-secret-001';

describe('Signature Compatibility testing module', () => {
  it('maps eight signer/verifier mismatches into confirmed findings with exact comparisons', async () => {
    const { graph } = await scanRepository({ rootPath: vulnerablePath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('signature-compatibility'));

    expect(findings).toHaveLength(8);
    for (const finding of findings) {
      expect(finding.status).toBe('confirmed');
      expect(finding.severity).toBe('high');
      expect(finding.ruleId).toBe('security/signature-compatibility/canonical-mismatch');
      expect(finding.affectedNodeIds.length).toBeGreaterThanOrEqual(4);
      for (const nodeId of finding.affectedNodeIds) {
        expect(graph.nodes.some(node => node.id === nodeId)).toBe(true);
      }
      expect(finding.sourceLocation.filePath).toBe('.stackfold/signature-compatibility-results.json');
      expect(finding.evidence.length).toBeGreaterThanOrEqual(1);
      expect(finding.explanation).toContain('First differing input byte');
      expect(finding.suggestedAction.length).toBeGreaterThan(0);
      const comparison = finding.metadata?.exactComparison;
      expect(typeof comparison).toBe('string');
      expect((comparison as string).length).toBeGreaterThan(0);
      expect(finding.metadata?.firstDifferingByte).toBeGreaterThanOrEqual(0);
      expect(typeof finding.metadata?.firstDifferingStep).toBe('string');
    }

    const kinds = new Set(findings.map(finding => finding.metadata?.kind));
    for (const kind of ['raw-body', 'query-ordering', 'unicode-normalization', 'timestamp', 'header-casing', 'percent-encoding', 'hex-base64', 'newline-whitespace']) {
      expect(kinds.has(kind)).toBe(true);
    }

    expect(graph.nodes.filter(node => node.type === 'signer')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'verifier')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'signature_vector')).toHaveLength(8);
    expect(graph.nodes.filter(node => node.type === 'risk_boundary' && node.tags.includes('signature-compatibility'))).toHaveLength(8);
    expect(graph.edges.filter(edge => edge.type === 'signs')).toHaveLength(8);
    expect(graph.edges.filter(edge => edge.type === 'verifies')).toHaveLength(8);
    expect(graph.edges.filter(edge => edge.type === 'traces_to' && edge.source.includes('signature_vector'))).toHaveLength(8);
    expect(graph.edges.some(edge => edge.type === 'violates')).toBe(true);
    expect(graph.diagnostics.some(diag => diag.code === 'DANGLING_EDGE_REF')).toBe(false);

    expect(formatFindings(findings, 'terminal')).toContain('signature-compatibility');
    expect(formatFindings(findings, 'github-actions')).toContain('signature-compatibility');
    expect(formatFindings(findings, 'circleci')).toContain('signature-compatibility');
    expect(JSON.parse(formatFindings(findings, 'json'))).toHaveProperty('findings');

    const serialized = JSON.stringify(graph);
    expect(serialized).not.toContain(SYNTHETIC_SECRET);
  });

  it('produces signer/verifier/vector topology with zero findings for the passing fixture', async () => {
    const { graph } = await scanRepository({ rootPath: passingPath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('signature-compatibility'));

    expect(findings).toHaveLength(0);
    expect(graph.nodes.filter(node => node.type === 'signer')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'verifier')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'signature_vector')).toHaveLength(8);
    expect(graph.diagnostics.some(diag => diag.code === 'DANGLING_EDGE_REF')).toBe(false);
  });

  it('runs the live HMAC check with synthetic secrets only and reports the first differing byte', async () => {
    const fs = await import('node:fs');
    const config = parseSignatureCompatibilityConfig(
      fs.readFileSync(path.join(vulnerablePath, '.stackfold/signature-compatibility.json'), 'utf8')
    );
    const result = await runSignatureCompatibilityCheck(config, {
      env: { STACKFOLD_SIG_SECRET: SYNTHETIC_SECRET },
    });
    expect(result.vectors.filter(vector => vector.status === 'fail')).toHaveLength(8);
    const queryVector = result.vectors.find(vector => vector.id === 'query-ordering')!;
    expect(queryVector.firstDifferingByte).toBeGreaterThanOrEqual(0);
    expect(queryVector.firstDifferingStep).toContain('sort-query-keys');
    expect(firstDifferingByte(queryVector.signerCanonical, queryVector.verifierCanonical)).toBe(queryVector.firstDifferingByte);

    const passingConfig = parseSignatureCompatibilityConfig(
      fs.readFileSync(path.join(passingPath, '.stackfold/signature-compatibility.json'), 'utf8')
    );
    const passing = await runSignatureCompatibilityCheck(passingConfig, {
      env: { STACKFOLD_SIG_SECRET: SYNTHETIC_SECRET },
    });
    expect(passing.vectors.every(vector => vector.status === 'pass')).toBe(true);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SYNTHETIC_SECRET);
    expect(result.reproductionTest).toContain('STACKFOLD_SIG_SECRET');
    expect(result.reproductionTest).not.toContain(SYNTHETIC_SECRET);
  });

  it('requires the configured secret reference without exposing values', async () => {
    const fs = await import('node:fs');
    const config = parseSignatureCompatibilityConfig(
      fs.readFileSync(path.join(vulnerablePath, '.stackfold/signature-compatibility.json'), 'utf8')
    );
    await expect(runSignatureCompatibilityCheck(config, { env: {} })).rejects.toThrow('STACKFOLD_SIG_SECRET');
  });

  it('canonicalizes encoding-sensitive inputs deterministically', () => {
    const vector = {
      id: 'probe',
      label: 'probe',
      kind: 'hex-base64' as const,
      method: 'POST',
      path: '/webhooks/events',
      query: 'a=1',
      headers: {},
      body: '68656c6c6f',
    };
    expect(canonicalize(vector, ['decode-hex-body'])).toContain('hello');
    expect(canonicalize(vector, ['raw-body'])).toContain('68656c6c6f');
    expect(firstDifferingByte('abc', 'abc')).toBeNull();
    expect(firstDifferingByte('abc', 'abd')).toBe(2);
  });

  it('emits no signature findings when the module is not configured', async () => {
    const txEscapePath = path.resolve(currentDir, '../../../../fixtures/tx-escape-prisma');
    const { graph } = await scanRepository({ rootPath: txEscapePath, useCache: false });
    expect(graph.findings.filter(item => item.ruleId.includes('signature-compatibility'))).toHaveLength(0);
  });
});
