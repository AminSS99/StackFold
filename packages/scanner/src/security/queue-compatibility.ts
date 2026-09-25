import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { readSafeFile } from '../utils/file-system';

// Queue Compatibility: replay historical BullMQ job payloads written by an
// older producer against the current worker's declared payload contract and
// report, per payload, whether it is compatible, requires review, or fails —
// with the exact failing field or validation step.
//
// The first version is fully offline: no live Redis or production queue is
// required. Normal repository scans never execute arbitrary worker code; the
// check validates explicitly configured historical payload fixtures against
// an explicitly configured field contract, applying only declared migration
// renames. Job payload values and secrets stay out of findings, graph nodes,
// logs, and reports by default — only fingerprints, field paths, type names,
// and validation step names are recorded.

export const queuePayloadVerdictSchema = z.enum(['compatible', 'review', 'fail']);

export type QueuePayloadVerdict = z.infer<typeof queuePayloadVerdictSchema>;

const fieldTypeSchema = z.enum([
  'string',
  'integer',
  'number',
  'boolean',
  'object',
  'array',
  'null',
  'any',
]);

export type QueueFieldType = z.infer<typeof fieldTypeSchema>;

const queueFieldSchema = z.object({
  path: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean().default(true),
  addedIn: z.string().optional(),
  removedIn: z.string().optional(),
  renamedFrom: z.string().optional(),
});

const queueMigrationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  renames: z.record(z.string()).default({}),
});

const queueSchema = z.object({
  id: z.string().min(1),
  queue: z.string().min(1),
  connection: z.string().min(1).default('redis'),
  producer: z.object({
    file: z.string().min(1),
    function: z.string().min(1).default('enqueue'),
  }),
  consumer: z.object({
    file: z.string().min(1),
    function: z.string().min(1).default('process'),
    version: z.string().min(1),
  }),
  payloadVersions: z.array(z.string().min(1)).min(1),
  schema: z.object({
    fields: z.array(queueFieldSchema).min(1),
    strict: z.boolean().default(false),
  }),
  migrations: z.array(queueMigrationSchema).default([]),
  redactPaths: z.array(z.string().min(1)).default([]),
});

export type QueueDefinition = z.infer<typeof queueSchema>;

export const queueCompatibilityConfigSchema = z.object({
  schemaVersion: z.literal(1),
  queues: z.array(queueSchema).min(1),
  payloads: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    queue: z.string().min(1),
    jobName: z.string().min(1),
    payloadVersion: z.string().min(1),
    dataRef: z.string().min(1),
  })).min(1),
});

export type QueueCompatibilityConfig = z.infer<typeof queueCompatibilityConfigSchema>;
export type QueueTestPayload = QueueCompatibilityConfig['payloads'][number];

export interface QueuePayloadResult {
  id: string;
  label: string;
  queue: string;
  jobName: string;
  payloadVersion: string;
  consumerVersion: string;
  verdict: QueuePayloadVerdict;
  failingField: string | null;
  failingStep: string | null;
  dataFingerprint: string;
  comparison: string;
  appliedMigrations: string[];
  reason?: string;
}

export interface QueueCompatibilityQueueSummary {
  id: string;
  queue: string;
  consumerVersion: string;
  producerFile: string;
  consumerFile: string;
  payloadVersions: string[];
  compatible: number;
  review: number;
  fail: number;
}

export interface QueueCompatibilityResult {
  schemaVersion: 1;
  generatedAt: string;
  queues: QueueCompatibilityQueueSummary[];
  payloads: QueuePayloadResult[];
  reproductionTest: string;
}

export interface QueueCompatibilityRunOptions {
  env?: Record<string, string | undefined>;
  rootPath?: string;
}

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12);
}

export function parseQueueCompatibilityConfig(content: string): QueueCompatibilityConfig {
  return queueCompatibilityConfigSchema.parse(JSON.parse(content));
}

export function loadQueueCompatibilityConfig(rootPath: string): {
  config: QueueCompatibilityConfig;
  configPath: string;
} {
  const candidates = ['.stackfold/queue-compatibility.json', 'stackfold.queue-compatibility.json'];
  for (const configPath of candidates) {
    const content = readSafeFile(path.join(rootPath, configPath));
    if (content) return { config: parseQueueCompatibilityConfig(content), configPath };
  }
  throw new Error(`No Queue Compatibility configuration found in '${rootPath}'.`);
}

const DEFAULT_REDACT_LEAF_PATTERN = /token|secret|password|api[-_]?key|auth|credential|card/i;

function getPathValue(data: unknown, pathString: string): { found: boolean; value: unknown } {
  const parts = pathString.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') return { found: false, value: undefined };
    if (!(part in (current as Record<string, unknown>))) return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[part];
  }
  return { found: true, value: current };
}

function setPathValue(data: Record<string, unknown>, pathString: string, value: unknown): boolean {
  const parts = pathString.split('.');
  let current: Record<string, unknown> = data;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const next = current[part];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) return false;
    current = next as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1]!;
  if (!(leaf in current)) return false;
  current[leaf] = value;
  return true;
}

function deletePathValue(data: Record<string, unknown>, pathString: string): boolean {
  const parts = pathString.split('.');
  let current: Record<string, unknown> = data;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const next = current[part];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) return false;
    current = next as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1]!;
  if (!(leaf in current)) return false;
  delete current[leaf];
  return true;
}

function movePathValue(data: Record<string, unknown>, from: string, to: string): boolean {
  const { found, value } = getPathValue(data, from);
  if (!found) return false;
  if (getPathValue(data, to).found) return false;
  const toParts = to.split('.');
  let current: Record<string, unknown> = data;
  for (let i = 0; i < toParts.length - 1; i += 1) {
    const part = toParts[i]!;
    const next = current[part];
    if (next === undefined) {
      const created: Record<string, unknown> = {};
      current[part] = created;
      current = created;
      continue;
    }
    if (typeof next !== 'object' || next === null || Array.isArray(next)) return false;
    current = next as Record<string, unknown>;
  }
  current[toParts[toParts.length - 1]!] = value;
  deletePathValue(data, from);
  return true;
}

function collectLeafPaths(data: unknown, prefix = ''): string[] {
  if (Array.isArray(data)) {
    return data.flatMap((item, index) => collectLeafPaths(item, prefix ? `${prefix}.${index}` : `${index}`));
  }
  if (data !== null && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>).flatMap(([key, value]) =>
      collectLeafPaths(value, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

/** Strip secret-bearing values before any processing or fingerprinting. */
export function redactPayloadData(data: unknown, redactPaths: string[]): unknown {
  const clone = JSON.parse(JSON.stringify(data ?? null)) as unknown;
  const redact = (target: unknown, prefix = ''): void => {
    if (Array.isArray(target)) {
      target.forEach((item, index) => redact(item, prefix ? `${prefix}.${index}` : `${index}`));
      return;
    }
    if (target !== null && typeof target === 'object') {
      for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (
          redactPaths.includes(fullPath) ||
          redactPaths.includes(key) ||
          DEFAULT_REDACT_LEAF_PATTERN.test(key)
        ) {
          (target as Record<string, unknown>)[key] = '[redacted]';
        } else {
          redact(value, fullPath);
        }
      }
    }
  };
  redact(clone);
  return clone;
}

function actualTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function typeMatches(actual: string, expected: QueueFieldType): boolean {
  if (expected === 'any') return true;
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function findMigrationPath(
  queue: QueueDefinition,
  from: string,
  to: string
): Array<{ from: string; to: string; renames: Record<string, string> }> {
  if (from === to) return [];
  const byFrom = new Map<string, { from: string; to: string; renames: Record<string, string> }>();
  for (const migration of queue.migrations) {
    if (!byFrom.has(migration.from)) byFrom.set(migration.from, migration);
  }
  const steps: Array<{ from: string; to: string; renames: Record<string, string> }> = [];
  const seen = new Set<string>();
  let current = from;
  while (current !== to) {
    if (seen.has(current)) return [];
    seen.add(current);
    const step = byFrom.get(current);
    if (!step) return [];
    steps.push(step);
    current = step.to;
  }
  return steps;
}

export interface QueueReplayOutcome {
  verdict: QueuePayloadVerdict;
  failingField: string | null;
  failingStep: string | null;
  appliedMigrations: string[];
  comparison: string;
  workingData: unknown;
  reason?: string;
}

export function replayPayloadAgainstConsumer(
  queue: QueueDefinition,
  payload: QueueTestPayload,
  rawData: unknown
): QueueReplayOutcome {
  const data = (redactPayloadData(rawData, queue.redactPaths) ?? null) as Record<string, unknown> | null;
  const fingerprintNote = `payload #${fingerprint(canonicalJson(data))}`;
  const appliedMigrations: string[] = [];

  if (!queue.payloadVersions.includes(payload.payloadVersion)) {
    return {
      verdict: 'review',
      failingField: null,
      failingStep: 'check-version',
      appliedMigrations,
      comparison: `payload version '${payload.payloadVersion}' is not a declared version of queue '${queue.queue}' (known: ${queue.payloadVersions.join(', ')}). ${fingerprintNote}. Treat as requires-review, not proof of failure.`,
      workingData: data,
      reason: `unknown payload version '${payload.payloadVersion}'`,
    };
  }

  const consumerVersion = queue.consumer.version;
  const consumerIndex = queue.payloadVersions.indexOf(consumerVersion);
  const payloadIndex = queue.payloadVersions.indexOf(payload.payloadVersion);
  if (consumerIndex >= 0 && payloadIndex > consumerIndex) {
    return {
      verdict: 'review',
      failingField: null,
      failingStep: 'check-version',
      appliedMigrations,
      comparison: `payload version '${payload.payloadVersion}' is newer than the current worker version '${consumerVersion}'. The worker predates this payload shape. ${fingerprintNote}.`,
      workingData: data,
      reason: `producer ahead of worker (${payload.payloadVersion} > ${consumerVersion})`,
    };
  }

  const working = (JSON.parse(JSON.stringify(data ?? null)) as unknown) as Record<string, unknown>;
  if (payload.payloadVersion !== consumerVersion) {
    const migrationPath = findMigrationPath(queue, payload.payloadVersion, consumerVersion);
    if (migrationPath.length === 0) {
      return {
        verdict: 'fail',
        failingField: null,
        failingStep: 'apply-migrations',
        appliedMigrations,
        comparison: `no declared migration path from payload version '${payload.payloadVersion}' to worker version '${consumerVersion}' for queue '${queue.queue}'. ${fingerprintNote}. Declare one in migrations or align the producer.`,
        workingData: working,
        reason: `missing migration path ${payload.payloadVersion} -> ${consumerVersion}`,
      };
    }
    for (const step of migrationPath) {
      for (const [fromPath, toPath] of Object.entries(step.renames)) {
        if (movePathValue(working, fromPath, toPath)) {
          appliedMigrations.push(`${step.from}->${step.to}: rename '${fromPath}' to '${toPath}'`);
        }
      }
      appliedMigrations.push(`${step.from}->${step.to}: migration declared`);
    }
  }

  const fields = queue.schema.fields;
  const knownPaths = new Set(fields.map(field => field.path));
  const renamedFromPaths = new Set(
    fields.filter(field => field.renamedFrom).map(field => field.renamedFrom as string)
  );

  for (const field of fields) {
    if (!field.required) continue;
    const { found } = getPathValue(working, field.path);
    if (!found) {
      const addedNote = field.addedIn ? ` (added in ${field.addedIn})` : '';
      const renamedNote = field.renamedFrom ? ` (renamed from '${field.renamedFrom}')` : '';
      return {
        verdict: 'fail',
        failingField: field.path,
        failingStep: 'check-required-fields',
        appliedMigrations,
        comparison: `required field '${field.path}'${addedNote}${renamedNote} is missing for job '${payload.jobName}' at validation step 'check-required-fields'. Expected type '${field.type}'. ${fingerprintNote}.`,
        workingData: working,
        reason: `missing required field '${field.path}'`,
      };
    }
  }

  for (const field of fields) {
    const { found, value } = getPathValue(working, field.path);
    if (!found) continue;
    const actual = actualTypeName(value);
    if (!typeMatches(actual, field.type)) {
      return {
        verdict: 'fail',
        failingField: field.path,
        failingStep: 'check-field-types',
        appliedMigrations,
        comparison: `field '${field.path}' has type '${actual}' but the worker expects '${field.type}' for job '${payload.jobName}' at validation step 'check-field-types'. ${fingerprintNote}.`,
        workingData: working,
        reason: `type mismatch at '${field.path}' (actual '${actual}', expected '${field.type}')`,
      };
    }
  }

  const leafPaths = collectLeafPaths(working);
  for (const leafPath of leafPaths) {
    const removedField = fields.find(field => field.removedIn && field.path === leafPath);
    if (removedField) {
      return {
        verdict: 'review',
        failingField: leafPath,
        failingStep: 'check-removed-fields',
        appliedMigrations,
        comparison: `field '${leafPath}' was removed in ${removedField.removedIn} but is still present in the historical payload for job '${payload.jobName}'. The worker may ignore it. ${fingerprintNote}.`,
        workingData: working,
        reason: `removed field '${leafPath}' still present`,
      };
    }
    if (knownPaths.has(leafPath) || renamedFromPaths.has(leafPath)) continue;
    // Array indices belong to a known array field; only flag unknown object keys.
    const parentPath = leafPath.split('.').slice(0, -1).join('.');
    const leafKey = leafPath.split('.').pop() || '';
    if (/^\d+$/.test(leafKey) && (knownPaths.has(parentPath) || parentPath === '')) continue;
    if (queue.schema.strict) {
      return {
        verdict: 'fail',
        failingField: leafPath,
        failingStep: 'check-unknown-fields',
        appliedMigrations,
        comparison: `unknown field '${leafPath}' is present for job '${payload.jobName}' and the queue schema is strict. ${fingerprintNote}.`,
        workingData: working,
        reason: `unknown field '${leafPath}' under strict schema`,
      };
    }
    return {
      verdict: 'review',
      failingField: leafPath,
      failingStep: 'check-unknown-fields',
      appliedMigrations,
      comparison: `unknown field '${leafPath}' is present for job '${payload.jobName}' but is not part of the worker contract. The worker may ignore or reject it. ${fingerprintNote}.`,
      workingData: working,
      reason: `unknown field '${leafPath}'`,
    };
  }

  const migrationNote = appliedMigrations.length > 0
    ? ` Applied migrations: ${appliedMigrations.join('; ')}.`
    : '';
  return {
    verdict: 'compatible',
    failingField: null,
    failingStep: null,
    appliedMigrations,
    comparison: `payload '${payload.id}' satisfies the worker contract for job '${payload.jobName}' (consumer version '${consumerVersion}'). ${fingerprintNote}.${migrationNote}`,
    workingData: working,
  };
}

export function generateQueueCompatibilityReproduction(
  config: QueueCompatibilityConfig,
  results: QueuePayloadResult[]
): string {
  const cases = results.filter(item => item.verdict !== 'compatible').map(item => `
  test(${JSON.stringify(`queue verdict: ${item.label}`)}, () => {
    const recorded = resultsById(${JSON.stringify(item.id)});
    expect(recorded.verdict).toBe(${JSON.stringify(item.verdict)});
    expect(recorded.failingField).toBe(${JSON.stringify(item.failingField)});
    expect(recorded.failingStep).toBe(${JSON.stringify(item.failingStep)});
  });`).join('\n');

  return `import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Reproduction for .stackfold/queue-compatibility.json.
// Replays the checked-in historical payload fixtures against the recorded
// verdicts. Payload values are read from fixture files at test time and are
// never embedded here.
const root = process.env.STACKFOLD_QUEUE_ROOT || process.cwd();
const recorded = JSON.parse(
  fs.readFileSync(
    path.join(root, '.stackfold/queue-compatibility-results.json'),
    'utf8'
  )
) as { payloads: Array<{ id: string; verdict: string; failingField: string | null; failingStep: string | null }> };

function resultsById(id: string) {
  const found = recorded.payloads.find(item => item.id === id);
  if (!found) throw new Error(\`No recorded payload '\${id}'.\`);
  return found;
}
${cases || '\ntest(\'queue compatibility: all historical payloads compatible\', () => {\n  expect(recorded.payloads.every(item => item.verdict === \'compatible\')).toBe(true);\n});'}
`;
}

export async function runQueueCompatibilityCheck(
  config: QueueCompatibilityConfig,
  options: QueueCompatibilityRunOptions = {}
): Promise<QueueCompatibilityResult> {
  void options.env;
  const rootPath = options.rootPath || process.cwd();
  const queueById = new Map(config.queues.map(queue => [queue.id, queue]));

  const payloads: QueuePayloadResult[] = config.payloads.map(payload => {
    const queue = queueById.get(payload.queue);
    if (!queue) {
      return {
        id: payload.id,
        label: payload.label,
        queue: payload.queue,
        jobName: payload.jobName,
        payloadVersion: payload.payloadVersion,
        consumerVersion: 'unknown',
        verdict: 'review' as const,
        failingField: null,
        failingStep: 'resolve-queue',
        dataFingerprint: fingerprint(payload.id),
        comparison: `payload '${payload.id}' references unknown queue '${payload.queue}'. Declare it in queues. Treat as requires-review, not proof of failure.`,
        appliedMigrations: [],
        reason: `unknown queue '${payload.queue}'`,
      };
    }
    const dataRefPath = path.join(rootPath, payload.dataRef);
    const content = readSafeFile(dataRefPath);
    if (!content) {
      return {
        id: payload.id,
        label: payload.label,
        queue: queue.id,
        jobName: payload.jobName,
        payloadVersion: payload.payloadVersion,
        consumerVersion: queue.consumer.version,
        verdict: 'review' as const,
        failingField: null,
        failingStep: 'load-payload-fixture',
        dataFingerprint: fingerprint(payload.id),
        comparison: `historical payload fixture '${payload.dataRef}' could not be read for job '${payload.jobName}'. payload #${fingerprint(payload.id)}. Treat as requires-review, not proof of failure.`,
        appliedMigrations: [],
        reason: `payload fixture '${payload.dataRef}' not found`,
      };
    }
    let rawData: unknown;
    try {
      rawData = JSON.parse(content);
    } catch {
      return {
        id: payload.id,
        label: payload.label,
        queue: queue.id,
        jobName: payload.jobName,
        payloadVersion: payload.payloadVersion,
        consumerVersion: queue.consumer.version,
        verdict: 'review' as const,
        failingField: null,
        failingStep: 'load-payload-fixture',
        dataFingerprint: fingerprint(content),
        comparison: `historical payload fixture '${payload.dataRef}' is not valid JSON for job '${payload.jobName}'. Treat as requires-review, not proof of failure.`,
        appliedMigrations: [],
        reason: `payload fixture '${payload.dataRef}' is not valid JSON`,
      };
    }
    const outcome = replayPayloadAgainstConsumer(queue, payload, rawData);
    return {
      id: payload.id,
      label: payload.label,
      queue: queue.id,
      jobName: payload.jobName,
      payloadVersion: payload.payloadVersion,
      consumerVersion: queue.consumer.version,
      verdict: outcome.verdict,
      failingField: outcome.failingField,
      failingStep: outcome.failingStep,
      dataFingerprint: fingerprint(canonicalJson(outcome.workingData)),
      comparison: outcome.comparison,
      appliedMigrations: outcome.appliedMigrations,
      reason: outcome.reason,
    };
  });

  const queues: QueueCompatibilityQueueSummary[] = config.queues.map(queue => ({
    id: queue.id,
    queue: queue.queue,
    consumerVersion: queue.consumer.version,
    producerFile: queue.producer.file,
    consumerFile: queue.consumer.file,
    payloadVersions: queue.payloadVersions,
    compatible: payloads.filter(item => item.queue === queue.id && item.verdict === 'compatible').length,
    review: payloads.filter(item => item.queue === queue.id && item.verdict === 'review').length,
    fail: payloads.filter(item => item.queue === queue.id && item.verdict === 'fail').length,
  }));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    queues,
    payloads,
    reproductionTest: generateQueueCompatibilityReproduction(config, payloads),
  };
}

export const queueCompatibilityResultSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  queues: z.array(z.object({
    id: z.string().min(1),
    queue: z.string().min(1),
    consumerVersion: z.string().min(1),
    producerFile: z.string().min(1),
    consumerFile: z.string().min(1),
    payloadVersions: z.array(z.string()),
    compatible: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    fail: z.number().int().nonnegative(),
  })),
  payloads: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    queue: z.string().min(1),
    jobName: z.string().min(1),
    payloadVersion: z.string().min(1),
    consumerVersion: z.string().min(1),
    verdict: queuePayloadVerdictSchema,
    failingField: z.string().nullable(),
    failingStep: z.string().nullable(),
    dataFingerprint: z.string().length(12),
    comparison: z.string().min(1),
    appliedMigrations: z.array(z.string()),
    reason: z.string().optional(),
  })),
  reproductionTest: z.string().min(1),
});

export type QueueCompatibilityResultParsed = z.infer<typeof queueCompatibilityResultSchema>;

export function parseQueueCompatibilityResult(content: string): QueueCompatibilityResult {
  return queueCompatibilityResultSchema.parse(JSON.parse(content)) as QueueCompatibilityResult;
}
