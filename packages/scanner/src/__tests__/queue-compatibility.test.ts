import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatFindings,
  parseQueueCompatibilityConfig,
  redactPayloadData,
  replayPayloadAgainstConsumer,
  runQueueCompatibilityCheck,
  scanRepository,
} from '../index';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const failingPath = path.resolve(currentDir, '../../../../fixtures/queue-compatibility-failing');
const passingPath = path.resolve(currentDir, '../../../../fixtures/queue-compatibility-passing');

function readFailingConfig() {
  return parseQueueCompatibilityConfig(
    fs.readFileSync(path.join(failingPath, '.stackfold/queue-compatibility.json'), 'utf8')
  );
}

describe('Queue Compatibility testing module', () => {
  it('maps historical payload replays into confirmed and review findings with exact fields', async () => {
    const { graph } = await scanRepository({ rootPath: failingPath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('queue-compatibility'));

    expect(findings).toHaveLength(4);
    const confirmed = findings.filter(finding => finding.status === 'confirmed');
    const uncertain = findings.filter(finding => finding.status === 'uncertain');
    expect(confirmed).toHaveLength(2);
    expect(uncertain).toHaveLength(2);

    for (const finding of confirmed) {
      expect(finding.ruleId).toBe('queue/queue-compatibility/payload-incompatible');
      expect(finding.severity).toBe('high');
    }
    for (const finding of uncertain) {
      expect(finding.ruleId).toBe('queue/queue-compatibility/payload-needs-review');
      expect(finding.severity).toBe('medium');
    }

    const byPayload = new Map(findings.map(finding => [finding.metadata?.payloadId, finding]));
    expect(byPayload.get('charge-v1-missing-email')?.metadata?.failingField).toBe('customer.email');
    expect(byPayload.get('charge-v1-missing-email')?.metadata?.failingStep).toBe('check-required-fields');
    expect(byPayload.get('charge-v2-wrong-type')?.metadata?.failingField).toBe('amountCents');
    expect(byPayload.get('charge-v2-wrong-type')?.metadata?.failingStep).toBe('check-field-types');
    expect(byPayload.get('charge-v2-extra-field')?.metadata?.failingField).toBe('priority');
    expect(byPayload.get('charge-v1-legacy-note')?.metadata?.failingField).toBe('legacyNote');

    for (const finding of findings) {
      expect(finding.affectedNodeIds.length).toBeGreaterThanOrEqual(3);
      for (const nodeId of finding.affectedNodeIds) {
        expect(graph.nodes.some(node => node.id === nodeId)).toBe(true);
      }
      const producerNode = graph.nodes.find(node => finding.affectedNodeIds.includes(node.id) && node.type === 'queue_producer');
      const consumerNode = graph.nodes.find(node => finding.affectedNodeIds.includes(node.id) && node.type === 'queue_consumer');
      expect(producerNode?.filePath).toBe('src/producer.js');
      expect(consumerNode?.filePath).toBe('src/worker.js');
      expect(finding.sourceLocation.filePath).toBe('.stackfold/queue-compatibility-results.json');
      expect(finding.evidence.length).toBeGreaterThanOrEqual(1);
      expect(finding.suggestedAction.length).toBeGreaterThan(0);
      expect(typeof finding.metadata?.exactComparison).toBe('string');
    }

    expect(graph.nodes.filter(node => node.type === 'queue')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'queue_producer')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'queue_consumer')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'job_payload')).toHaveLength(6);
    expect(graph.nodes.filter(node => node.type === 'risk_boundary' && node.tags.includes('queue-compatibility'))).toHaveLength(4);
    expect(graph.edges.filter(edge => edge.type === 'enqueues')).toHaveLength(1);
    expect(graph.edges.filter(edge => edge.type === 'consumes')).toHaveLength(1);
    expect(graph.edges.filter(edge => edge.type === 'replays')).toHaveLength(6);
    expect(graph.edges.filter(edge => edge.type === 'violates')).toHaveLength(4);
    expect(graph.diagnostics.some(diag => diag.code === 'DANGLING_EDGE_REF')).toBe(false);

    expect(formatFindings(findings, 'terminal')).toContain('queue-compatibility');
    expect(formatFindings(findings, 'github-actions')).toContain('queue-compatibility');
    expect(formatFindings(findings, 'circleci')).toContain('queue-compatibility');
    expect(JSON.parse(formatFindings(findings, 'json'))).toHaveProperty('findings');

    const serialized = JSON.stringify(graph);
    for (const secret of ['tok_test_synthetic_001', 'ch_test_001', 'cus_test_123', 'receipts@example.com', 'migrated from legacy']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('produces queue topology with zero findings for the passing fixture', async () => {
    const { graph } = await scanRepository({ rootPath: passingPath, useCache: false });
    const findings = graph.findings.filter(item => item.ruleId.includes('queue-compatibility'));

    expect(findings).toHaveLength(0);
    expect(graph.nodes.filter(node => node.type === 'queue')).toHaveLength(1);
    expect(graph.nodes.filter(node => node.type === 'job_payload')).toHaveLength(2);
    expect(graph.diagnostics.some(diag => diag.code === 'DANGLING_EDGE_REF')).toBe(false);
  });

  it('replays historical payloads offline with verdicts, migrations, and redaction', async () => {
    const config = readFailingConfig();
    const result = await runQueueCompatibilityCheck(config, { rootPath: failingPath });
    const byId = new Map(result.payloads.map(item => [item.id, item]));

    expect(byId.get('charge-v2-ok')?.verdict).toBe('compatible');
    expect(byId.get('charge-v1-migratable')?.verdict).toBe('compatible');
    expect(byId.get('charge-v1-migratable')?.appliedMigrations.some(step => step.includes("rename 'amount'"))).toBe(true);
    expect(byId.get('charge-v1-missing-email')?.verdict).toBe('fail');
    expect(byId.get('charge-v2-wrong-type')?.verdict).toBe('fail');
    expect(byId.get('charge-v2-extra-field')?.verdict).toBe('review');
    expect(byId.get('charge-v1-legacy-note')?.verdict).toBe('review');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('tok_test_synthetic_001');
    expect(result.reproductionTest).toContain('.stackfold/queue-compatibility-results.json');
  });

  it('redacts secret-bearing values before fingerprinting', () => {
    const queue = readFailingConfig().queues[0]!;
    const outcome = replayPayloadAgainstConsumer(
      queue,
      { id: 'probe', label: 'probe', queue: 'billing', jobName: 'charge', payloadVersion: 'v2', dataRef: 'probe.json' },
      {
        chargeId: 'ch_probe',
        amountCents: 100,
        currency: 'USD',
        customer: { id: 'cus_probe', email: 'probe@example.com' },
        cardToken: 'tok_live_secret',
      }
    );
    expect(outcome.verdict).toBe('compatible');
    const serialized = JSON.stringify(outcome.workingData);
    expect(serialized).not.toContain('tok_live_secret');
    expect(serialized).toContain('[redacted]');

    // Default secret-like leaf patterns are redacted even off declared paths.
    const redacted = redactPayloadData(
      { nested: { password: 'hunter2', apiKey: 'ak_live', plain: 'visible' } },
      []
    );
    const redactedSerialized = JSON.stringify(redacted);
    expect(redactedSerialized).not.toContain('hunter2');
    expect(redactedSerialized).not.toContain('ak_live');
    expect(redactedSerialized).toContain('visible');
  });

  it('marks missing fixtures and unknown queues as review, never confirmed', async () => {
    const config = readFailingConfig();
    const missingQueue = {
      id: 'ghost-payload',
      label: 'ghost',
      queue: 'no-such-queue',
      jobName: 'charge',
      payloadVersion: 'v1',
      dataRef: '.stackfold/queue-payloads/ghost.json',
    };
    const missingFile = {
      id: 'missing-payload',
      label: 'missing',
      queue: 'billing',
      jobName: 'charge',
      payloadVersion: 'v2',
      dataRef: '.stackfold/queue-payloads/does-not-exist.json',
    };
    const result = await runQueueCompatibilityCheck(
      { ...config, payloads: [missingQueue, missingFile] },
      { rootPath: failingPath }
    );
    expect(result.payloads[0]!.verdict).toBe('review');
    expect(result.payloads[0]!.failingStep).toBe('resolve-queue');
    expect(result.payloads[1]!.verdict).toBe('review');
    expect(result.payloads[1]!.failingStep).toBe('load-payload-fixture');
  });

  it('flags producer-ahead payloads as review', () => {
    const queue = readFailingConfig().queues[0]!;
    const outcome = replayPayloadAgainstConsumer(
      queue,
      { id: 'probe', label: 'probe', queue: 'billing', jobName: 'charge', payloadVersion: 'v3', dataRef: 'probe.json' },
      {}
    );
    // v3 is not declared at all, so the unknown-version review triggers first.
    expect(outcome.verdict).toBe('review');
    expect(outcome.failingStep).toBe('check-version');
  });

  it('emits no queue findings when the module is not configured', async () => {
    const txEscapePath = path.resolve(currentDir, '../../../../fixtures/tx-escape-prisma');
    const { graph } = await scanRepository({ rootPath: txEscapePath, useCache: false });
    expect(graph.findings.filter(item => item.ruleId.includes('queue-compatibility'))).toHaveLength(0);
  });

  it('redactPayloadData is exported for adapter use', () => {
    expect(redactPayloadData({ a: 1 }, [])).toEqual({ a: 1 });
  });

  it('downgrades worker-tolerated missing fields to review instead of confirmed fail', () => {
    const queue = {
      ...readFailingConfig().queues[0]!,
      schema: {
        strict: false,
        fields: readFailingConfig().queues[0]!.schema.fields.map(field =>
          field.path === 'customer.email' ? { ...field, onMissing: 'review' as const } : field
        ),
      },
    };
    const outcome = replayPayloadAgainstConsumer(
      queue,
      { id: 'probe', label: 'probe', queue: 'billing', jobName: 'charge', payloadVersion: 'v1', dataRef: 'probe.json' },
      { chargeId: 'ch_probe', amount: 100, currency: 'USD', customer: { id: 'cus_probe' } }
    );
    expect(outcome.verdict).toBe('review');
    expect(outcome.failingField).toBe('customer.email');
    expect(outcome.failingStep).toBe('check-required-fields');
    expect(outcome.reason).toContain('tolerated');
  });

  it('downgrades worker-tolerated type mismatches to review instead of confirmed fail', () => {
    const queue = {
      ...readFailingConfig().queues[0]!,
      schema: {
        strict: false,
        fields: readFailingConfig().queues[0]!.schema.fields.map(field =>
          field.path === 'amountCents' ? { ...field, onTypeMismatch: 'review' as const } : field
        ),
      },
    };
    const outcome = replayPayloadAgainstConsumer(
      queue,
      { id: 'probe', label: 'probe', queue: 'billing', jobName: 'charge', payloadVersion: 'v2', dataRef: 'probe.json' },
      {
        chargeId: 'ch_probe',
        amountCents: '1999',
        currency: 'USD',
        customer: { id: 'cus_probe', email: 'probe@example.com' },
      }
    );
    expect(outcome.verdict).toBe('review');
    expect(outcome.failingField).toBe('amountCents');
    expect(outcome.failingStep).toBe('check-field-types');
  });

  it('reports top-level unknown fields before nested ones and lists every unknown path', () => {
    const queue = readFailingConfig().queues[0]!;
    const outcome = replayPayloadAgainstConsumer(
      queue,
      { id: 'probe', label: 'probe', queue: 'billing', jobName: 'charge', payloadVersion: 'v2', dataRef: 'probe.json' },
      {
        chargeId: 'ch_probe',
        amountCents: 100,
        currency: 'USD',
        customer: { id: 'cus_probe', email: 'probe@example.com', nickname: 'nick' },
        metadata: { orderId: 'ord_1' },
        topLevelExtra: true,
      }
    );
    expect(outcome.verdict).toBe('review');
    expect(outcome.failingField).toBe('topLevelExtra');
    expect(outcome.comparison).toContain("'topLevelExtra'");
    expect(outcome.comparison).toContain("'customer.nickname'");
    expect(outcome.comparison).toContain("'metadata.orderId'");
  });
});
