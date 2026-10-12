import path from 'node:path';
import type { Evidence, SourceRange } from '@stackfold/graph';
import type { DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';
import { parseCacheIsolationConfig, parseCacheIsolationResult } from './cache-isolation';

const RULE_ID = 'security/cache-isolation/cross-session-private-marker';

function findRange(content: string, needle: string): SourceRange | undefined {
  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(`\"${needle}\"`));
  if (index < 0) return undefined;
  const column = Math.max(0, lines[index]!.indexOf(`\"${needle}\"`));
  return {
    startLine: index + 1,
    startColumn: column,
    endLine: index + 1,
    endColumn: column + needle.length + 2,
  };
}

export const cacheIsolationDetector: DetectorInterface = {
  id: 'cache-isolation',
  name: 'Cache Isolation: two-session private marker analysis',

  run(context) {
    const configPath = context.cacheIsolationConfigFiles[0];
    const resultPath = context.cacheIsolationResultFiles[0];
    if (!configPath || !resultPath) return;

    const configContent = readSafeFile(path.join(context.rootPath, configPath));
    const resultContent = readSafeFile(path.join(context.rootPath, resultPath));
    if (!configContent || !resultContent) return;

    try {
      parseCacheIsolationConfig(configContent);
      const result = parseCacheIsolationResult(resultContent);
      const sessionEvidence: Evidence = {
        detectorId: 'cache-isolation',
        rule: 'isolated-browser-contexts',
        filePath: resultPath,
        codeSnippet: `two browser contexts authenticated via ${result.authenticationHeader}`,
        notes: 'Only the authentication mechanism is recorded; credential and private marker values are excluded.',
      };
      const sessionA = context.builder.createAndAddNode({
        type: 'browser_session',
        key: `cache-isolation:${result.environment}:session-a`,
        displayName: 'Session A',
        filePath: resultPath,
        metadata: { environment: result.environment, role: 'cache-warmer', authenticationKind: result.authenticationKind },
        evidence: sessionEvidence,
        tags: ['cache-isolation', 'session', 'session-a'],
      });
      const sessionB = context.builder.createAndAddNode({
        type: 'browser_session',
        key: `cache-isolation:${result.environment}:session-b`,
        displayName: 'Session B',
        filePath: resultPath,
        metadata: { environment: result.environment, role: 'isolation-checker', authenticationKind: result.authenticationKind },
        evidence: sessionEvidence,
        tags: ['cache-isolation', 'session', 'session-b'],
      });

      for (const probe of result.probes) {
        const resultRange = findRange(resultContent, probe.id);
        const probeEvidence: Evidence = {
          detectorId: 'cache-isolation',
          rule: 'two-session-probe-result',
          filePath: resultPath,
          sourceRange: resultRange,
          codeSnippet: `${probe.kind} ${probe.path}: ${probe.status}`,
          notes: `Session A ${probe.cacheStatusA}; Session B ${probe.cacheStatusB}; private marker fingerprint #${probe.markerFingerprint}.`,
        };
        const probeNode = context.builder.createAndAddNode({
          type: 'security_probe',
          key: `cache-isolation:${probe.id}`,
          displayName: probe.label,
          filePath: resultPath,
          sourceRange: resultRange,
          metadata: {
            probeId: probe.id,
            kind: probe.kind,
            path: probe.path,
            status: probe.status,
            sessionAStatus: probe.sessionAStatus,
            sessionBStatus: probe.sessionBStatus,
            durationMs: probe.durationMs,
          },
          evidence: probeEvidence,
          tags: ['cache-isolation', 'security-probe', probe.status],
        });
        const cacheNode = context.builder.createAndAddNode({
          type: 'cache_layer',
          key: `http:${probe.path}`,
          displayName: `Shared cache key ${probe.path}`,
          filePath: resultPath,
          sourceRange: resultRange,
          metadata: {
            path: probe.path,
            cacheStatusA: probe.cacheStatusA,
            cacheStatusB: probe.cacheStatusB,
            cacheControl: probe.cacheControl,
            age: probe.age,
            variesBySession: false,
          },
          evidence: probeEvidence,
          tags: ['cache-isolation', 'cache-layer', probe.status],
        });
        context.builder.createAndAddEdge({ source: sessionA.id, target: cacheNode.id, type: 'warms', evidence: probeEvidence });
        context.builder.createAndAddEdge({ source: cacheNode.id, target: sessionB.id, type: 'serves', evidence: probeEvidence });
        context.builder.createAndAddEdge({ source: probeNode.id, target: cacheNode.id, type: 'traces_to', evidence: probeEvidence });

        if (probe.status !== 'leak') continue;
        const findingId = `finding:${RULE_ID}:${probe.id}`;
        const boundaryNode = context.builder.createAndAddNode({
          type: 'risk_boundary',
          key: `${RULE_ID}:${probe.id}`,
          displayName: 'Private marker exposed',
          filePath: resultPath,
          sourceRange: resultRange,
          metadata: {
            ruleId: RULE_ID,
            severity: 'critical',
            status: 'confirmed',
            probeId: probe.id,
            path: probe.path,
            responseKind: probe.kind,
            cacheStatus: probe.cacheStatusB,
            findingId,
          },
          evidence: probeEvidence,
          tags: ['security', 'cache-isolation', 'risk', 'confirmed-leak'],
        });
        context.builder.createAndAddEdge({
          source: cacheNode.id,
          target: boundaryNode.id,
          type: 'exposes_private_data',
          evidence: probeEvidence,
        });
        context.builder.createAndAddEdge({
          source: boundaryNode.id,
          target: sessionB.id,
          type: 'violates',
          evidence: probeEvidence,
        });
        context.builder.addFinding({
          id: findingId,
          ruleId: RULE_ID,
          severity: 'critical',
          status: 'confirmed',
          title: `Cache Isolation: Session B received Session A's private marker from ${probe.path}`,
          affectedNodeIds: [sessionA.id, sessionB.id, probeNode.id, cacheNode.id, boundaryNode.id],
          sourceLocation: { filePath: resultPath, sourceRange: resultRange },
          evidence: [sessionEvidence, probeEvidence],
          explanation: `After Session A warmed '${probe.path}', a distinct authenticated browser context requested the same path and received Session A's fingerprinted private marker. The second response reported '${probe.cacheStatusB}', confirming cross-session data reuse at the cache boundary.`,
          suggestedAction: `Make the response private or non-cacheable, or include the authenticated identity in the cache key. Re-run the generated two-session Playwright reproduction against a production build before closing this finding.`,
          metadata: {
            analyzer: 'Cache Isolation',
            environment: result.environment,
            probeKind: probe.kind,
            path: probe.path,
            cacheStatusA: probe.cacheStatusA,
            cacheStatusB: probe.cacheStatusB,
            markerFingerprint: probe.markerFingerprint,
            reproductionFramework: 'playwright',
            reproductionTest: result.reproductionTest,
            securityCertification: false,
          },
        });
      }
    } catch (error) {
      context.diagnostics.push({
        level: 'warning',
        code: 'CACHE_ISOLATION_INVALID_RESULT',
        message: `Cache Isolation skipped invalid configuration or results at '${resultPath}'.`,
        filePath: resultPath,
        details: { reason: error instanceof Error ? error.message : String(error) },
      });
    }
  },
};
