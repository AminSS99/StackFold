import path from 'node:path';
import type { Evidence, SourceRange } from '@stackfold/graph';
import type { DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';
import {
  parseQueueCompatibilityConfig,
  parseQueueCompatibilityResult,
} from './queue-compatibility';

const INCOMPATIBLE_RULE_ID = 'queue/queue-compatibility/payload-incompatible';
const REVIEW_RULE_ID = 'queue/queue-compatibility/payload-needs-review';

function findRange(content: string, needle: string): SourceRange | undefined {
  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(`"${needle}"`));
  if (index < 0) return undefined;
  const column = Math.max(0, lines[index]!.indexOf(`"${needle}"`));
  return {
    startLine: index + 1,
    startColumn: column,
    endLine: index + 1,
    endColumn: column + needle.length + 2,
  };
}

export const queueCompatibilityDetector: DetectorInterface = {
  id: 'queue-compatibility',
  name: 'Queue Compatibility: historical BullMQ payload replay analysis',

  run(context) {
    const configPath = context.queueCompatibilityConfigFiles[0];
    const resultPath = context.queueCompatibilityResultFiles[0];
    if (!configPath || !resultPath) return;

    const configContent = readSafeFile(path.join(context.rootPath, configPath));
    const resultContent = readSafeFile(path.join(context.rootPath, resultPath));
    if (!configContent || !resultContent) return;

    try {
      const config = parseQueueCompatibilityConfig(configContent);
      const result = parseQueueCompatibilityResult(resultContent);
      const queueById = new Map(config.queues.map(queue => [queue.id, queue]));

      const adapterEvidence: Evidence = {
        detectorId: 'queue-compatibility',
        rule: 'configured-queue-adapters',
        filePath: configPath,
        codeSnippet: `queues ${config.queues.map(queue => `${queue.queue}@${queue.consumer.version}`).join(', ')}`,
        notes: 'Only queue names, adapter file references, and payload versions are recorded; payload values and secrets are excluded.',
      };

      const queueNodeById = new Map<string, string>();
      const producerNodeByQueue = new Map<string, string>();
      const consumerNodeByQueue = new Map<string, string>();

      for (const queue of config.queues) {
        const queueNode = context.builder.createAndAddNode({
          type: 'queue',
          key: `queue-compatibility:${queue.id}`,
          displayName: `Queue ${queue.queue}`,
          filePath: configPath,
          metadata: {
            queueId: queue.id,
            queueName: queue.queue,
            connection: queue.connection,
            consumerVersion: queue.consumer.version,
            payloadVersions: queue.payloadVersions,
          },
          evidence: adapterEvidence,
          tags: ['queue-compatibility', 'queue'],
        });
        queueNodeById.set(queue.id, queueNode.id);

        const producerNode = context.builder.createAndAddNode({
          type: 'queue_producer',
          key: `queue-compatibility:producer:${queue.producer.file}`,
          displayName: `Producer ${queue.producer.file}`,
          filePath: queue.producer.file,
          metadata: {
            file: queue.producer.file,
            function: queue.producer.function,
            queueId: queue.id,
          },
          evidence: adapterEvidence,
          tags: ['queue-compatibility', 'producer'],
        });
        producerNodeByQueue.set(queue.id, producerNode.id);

        const consumerNode = context.builder.createAndAddNode({
          type: 'queue_consumer',
          key: `queue-compatibility:consumer:${queue.consumer.file}`,
          displayName: `Consumer ${queue.consumer.file}`,
          filePath: queue.consumer.file,
          metadata: {
            file: queue.consumer.file,
            function: queue.consumer.function,
            version: queue.consumer.version,
            queueId: queue.id,
          },
          evidence: adapterEvidence,
          tags: ['queue-compatibility', 'consumer'],
        });
        consumerNodeByQueue.set(queue.id, consumerNode.id);

        context.builder.createAndAddEdge({ source: producerNode.id, target: queueNode.id, type: 'enqueues', evidence: adapterEvidence });
        context.builder.createAndAddEdge({ source: consumerNode.id, target: queueNode.id, type: 'consumes', evidence: adapterEvidence });
      }

      for (const payload of result.payloads) {
        const queue = queueById.get(payload.queue);
        const payloadRange = findRange(resultContent, payload.id);
        const payloadEvidence: Evidence = {
          detectorId: 'queue-compatibility',
          rule: 'historical-payload-replay',
          filePath: resultPath,
          sourceRange: payloadRange,
          codeSnippet: `${payload.jobName}@${payload.payloadVersion} -> ${payload.consumerVersion}: ${payload.verdict}`,
          notes: `Payload fingerprint #${payload.dataFingerprint}. ${payload.failingStep || 'No validation divergence.'}`,
        };
        const payloadNode = context.builder.createAndAddNode({
          type: 'job_payload',
          key: `queue-compatibility:${payload.id}`,
          displayName: payload.label,
          filePath: resultPath,
          sourceRange: payloadRange,
          metadata: {
            payloadId: payload.id,
            queueId: payload.queue,
            jobName: payload.jobName,
            payloadVersion: payload.payloadVersion,
            consumerVersion: payload.consumerVersion,
            verdict: payload.verdict,
            failingField: payload.failingField,
            failingStep: payload.failingStep,
          },
          evidence: payloadEvidence,
          tags: ['queue-compatibility', 'job-payload', payload.verdict],
        });

        const queueNodeId = queueNodeById.get(payload.queue);
        const consumerNodeId = consumerNodeByQueue.get(payload.queue);
        if (queueNodeId) {
          context.builder.createAndAddEdge({ source: payloadNode.id, target: queueNodeId, type: 'traces_to', evidence: payloadEvidence });
        }
        if (consumerNodeId) {
          context.builder.createAndAddEdge({ source: payloadNode.id, target: consumerNodeId, type: 'replays', evidence: payloadEvidence });
        }

        if (payload.verdict === 'compatible') continue;

        const isConfirmed = payload.verdict === 'fail';
        const ruleId = isConfirmed ? INCOMPATIBLE_RULE_ID : REVIEW_RULE_ID;
        const findingId = `finding:${ruleId}:${payload.id}`;
        const boundaryNode = context.builder.createAndAddNode({
          type: 'risk_boundary',
          key: `${ruleId}:${payload.id}`,
          displayName: isConfirmed ? 'Historical payload fails worker contract' : 'Historical payload needs review',
          filePath: resultPath,
          sourceRange: payloadRange,
          metadata: {
            ruleId,
            severity: isConfirmed ? 'high' : 'medium',
            status: isConfirmed ? 'confirmed' : 'uncertain',
            payloadId: payload.id,
            queueId: payload.queue,
            jobName: payload.jobName,
            failingField: payload.failingField,
            failingStep: payload.failingStep,
            findingId,
          },
          evidence: payloadEvidence,
          tags: ['queue', 'queue-compatibility', 'risk', isConfirmed ? 'confirmed-incompatible' : 'uncertain'],
        });
        context.builder.createAndAddEdge({
          source: payloadNode.id,
          target: boundaryNode.id,
          type: 'traces_to',
          evidence: payloadEvidence,
        });
        const affectedNodeIds = [payloadNode.id, boundaryNode.id];
        if (producerNodeByQueue.get(payload.queue)) {
          affectedNodeIds.push(producerNodeByQueue.get(payload.queue) as string);
        }
        if (consumerNodeId) {
          affectedNodeIds.push(consumerNodeId);
          context.builder.createAndAddEdge({
            source: boundaryNode.id,
            target: consumerNodeId,
            type: 'violates',
            evidence: payloadEvidence,
          });
        }

        context.builder.addFinding({
          id: findingId,
          ruleId,
          severity: isConfirmed ? 'high' : 'medium',
          status: isConfirmed ? 'confirmed' : 'uncertain',
          title: isConfirmed
            ? `Queue Compatibility: historical '${payload.jobName}' payload fails the current worker contract (${payload.payloadVersion} -> ${payload.consumerVersion})`
            : `Queue Compatibility: historical '${payload.jobName}' payload requires review (${payload.payloadVersion} -> ${payload.consumerVersion})`,
          affectedNodeIds,
          sourceLocation: { filePath: resultPath, sourceRange: payloadRange },
          evidence: [adapterEvidence, payloadEvidence],
          explanation: isConfirmed
            ? `Replaying historical payload '${payload.label}' against worker version '${payload.consumerVersion}' fails at validation step '${payload.failingStep}' on field '${payload.failingField}'. Payload fingerprint #${payload.dataFingerprint}.`
            : `Replaying historical payload '${payload.label}' against worker version '${payload.consumerVersion}' is undecidable at validation step '${payload.failingStep}'${payload.failingField ? ` on field '${payload.failingField}'` : ''}: ${payload.reason || 'no comparable contract'}. Payload fingerprint #${payload.dataFingerprint}. Treat as requires-review, not proof of failure.`,
          suggestedAction: isConfirmed
            ? `Align the producer payload or add a declared migration for '${payload.failingField}' (see failing step), then re-run the generated reproduction before closing this finding.`
            : `Confirm the worker tolerates this payload (ignore, default, or migrate it) and either declare the handling or narrow the payload contract, then re-run the check.`,
          metadata: {
            analyzer: 'Queue Compatibility',
            queueId: payload.queue,
            payloadId: payload.id,
            queueName: queue?.queue,
            jobName: payload.jobName,
            payloadVersion: payload.payloadVersion,
            consumerVersion: payload.consumerVersion,
            verdict: payload.verdict,
            exactComparison: payload.comparison,
            failingField: payload.failingField,
            failingStep: payload.failingStep,
            dataFingerprint: payload.dataFingerprint,
            appliedMigrations: payload.appliedMigrations,
            producerFile: queue?.producer.file,
            consumerFile: queue?.consumer.file,
            reproductionFramework: 'vitest',
            reproductionTest: result.reproductionTest,
          },
        });
      }
    } catch (error) {
      context.diagnostics.push({
        level: 'warning',
        code: 'QUEUE_COMPATIBILITY_INVALID_RESULT',
        message: `Queue Compatibility skipped invalid configuration or results at '${resultPath}'.`,
        filePath: resultPath,
        details: { reason: error instanceof Error ? error.message : String(error) },
      });
    }
  },
};
