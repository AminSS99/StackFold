import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatFindings,
  generateCacheIsolationReproduction,
  parseCacheIsolationConfig,
  scanRepository,
} from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(currentDir, '../../../../fixtures/cache-isolation-vulnerable');

describe('Cache Isolation security module', () => {
  it('maps a two-session Playwright leak into graph evidence and a critical finding', async () => {
    const { graph } = await scanRepository({ rootPath: fixturePath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('cache-isolation'));

    expect(findings).toHaveLength(1);
    const finding = findings[0]!;
    expect(finding.status).toBe('confirmed');
    expect(finding.severity).toBe('critical');
    expect(finding.title).toContain('Session B');
    expect(finding.sourceLocation.filePath).toBe('.stackfold/cache-isolation-results.json');
    expect(finding.metadata?.reproductionFramework).toBe('playwright');
    expect(finding.metadata?.securityCertification).toBe(false);
    expect(finding.suggestedAction).toContain('production build');

    expect(graph.nodes.filter(node => node.type === 'browser_session')).toHaveLength(2);
    expect(graph.nodes.filter(node => node.type === 'security_probe')).toHaveLength(3);
    expect(graph.nodes.filter(node => node.type === 'cache_layer')).toHaveLength(3);
    expect(graph.edges.some(edge => edge.type === 'warms')).toBe(true);
    expect(graph.edges.some(edge => edge.type === 'serves')).toBe(true);
    expect(graph.edges.some(edge => edge.type === 'exposes_private_data')).toBe(true);
    expect(formatFindings(findings, 'github-actions')).toContain('cache-isolation');

    const serialized = JSON.stringify(graph);
    expect(serialized).not.toContain('private-marker-a');
    expect(serialized).not.toContain('private-marker-b');
    expect(serialized).not.toContain('fixture-auth-alpha');
    expect(serialized).not.toContain('fixture-auth-beta');
  });

  it('generates a minimal reproduction from environment references, never credential values', () => {
    const content = fs.readFileSync(
      path.join(fixturePath, '.stackfold/cache-isolation.json'),
      'utf8'
    );
    const config = parseCacheIsolationConfig(content);
    const reproduction = generateCacheIsolationReproduction(config);

    expect(reproduction).toContain("import { test, expect } from '@playwright/test'");
    expect(reproduction).toContain('browser.newContext');
    expect(reproduction).toContain('STACKFOLD_SESSION_A');
    expect(reproduction).toContain('STACKFOLD_MARKER_A');
    expect(reproduction).not.toContain('private-marker-a');
  });
});
