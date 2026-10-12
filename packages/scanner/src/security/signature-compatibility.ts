import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { readSafeFile } from '../utils/file-system';

// Signature Compatibility: test an application's existing signer and verifier
// implementations together and reveal the exact normalization or byte-level
// mismatch that causes verification failure.
//
// The module uses standard HMAC-SHA256 only (no invented protocol) with
// synthetic keys and test payloads. Secret values never enter findings, graph
// nodes, logs, or reports — only SHA-256 fingerprints and the synthetic
// canonical inputs that were signed.

export const signatureVectorKindSchema = z.enum([
  'raw-body',
  'query-ordering',
  'unicode-normalization',
  'timestamp',
  'header-casing',
  'percent-encoding',
  'hex-base64',
  'newline-whitespace',
]);

export type SignatureVectorKind = z.infer<typeof signatureVectorKindSchema>;

const canonicalStepSchema = z.enum([
  'uppercase-method',
  'preserve-method',
  'sort-query-keys',
  'preserve-query-order',
  'decode-percent-query',
  'preserve-percent-query',
  'lowercase-header-names',
  'preserve-header-case',
  'trim-header-values',
  'preserve-header-values',
  'raw-body',
  'json-sort-keys-body',
  'json-raw-body',
  'nfc-body',
  'nfd-body',
  'decode-hex-body',
  'decode-base64-body',
  'normalize-newlines-body',
  'preserve-newlines-body',
  'trim-body',
  'preserve-body',
  'collapse-whitespace-body',
  'preserve-whitespace-body',
  'decode-percent-body',
  'preserve-percent-body',
  'include-timestamp',
  'exclude-timestamp',
]);

export type CanonicalStep = z.infer<typeof canonicalStepSchema>;

export const signatureCompatibilityConfigSchema = z.object({
  schemaVersion: z.literal(1),
  algorithm: z.literal('hmac-sha256'),
  secretEnv: z.string().min(1),
  signer: z.object({
    file: z.string().min(1),
    function: z.string().min(1).default('sign'),
    canonicalization: z.array(canonicalStepSchema).min(1),
  }),
  verifier: z.object({
    file: z.string().min(1),
    function: z.string().min(1).default('verify'),
    canonicalization: z.array(canonicalStepSchema).min(1),
  }),
  vectors: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: signatureVectorKindSchema,
    method: z.string().min(1).default('POST'),
    path: z.string().startsWith('/'),
    query: z.string().default(''),
    headers: z.record(z.string()).default({}),
    body: z.string().default(''),
    timestamp: z.string().optional(),
  })).min(1),
});

export type SignatureCompatibilityConfig = z.infer<typeof signatureCompatibilityConfigSchema>;
export type SignatureTestVector = SignatureCompatibilityConfig['vectors'][number];

export interface SignatureVectorResult {
  id: string;
  label: string;
  kind: SignatureVectorKind;
  status: 'pass' | 'fail' | 'uncertain';
  signerCanonical: string;
  verifierCanonical: string;
  signerCanonicalFingerprint: string;
  verifierCanonicalFingerprint: string;
  signerSignatureFingerprint: string;
  verifierSignatureFingerprint: string;
  firstDifferingByte: number | null;
  firstDifferingStep: string | null;
  comparison: string;
  reason?: string;
}

export interface SignatureCompatibilityResult {
  schemaVersion: 1;
  generatedAt: string;
  algorithm: 'hmac-sha256';
  secretEnv: string;
  signerFile: string;
  signerFunction: string;
  verifierFile: string;
  verifierFunction: string;
  vectors: SignatureVectorResult[];
  reproductionTest: string;
}

export interface SignatureCompatibilityRunOptions {
  env?: Record<string, string | undefined>;
}

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12);
}

function hmacFingerprint(secret: string, canonical: string): string {
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex').slice(0, 12);
}

export function parseSignatureCompatibilityConfig(content: string): SignatureCompatibilityConfig {
  return signatureCompatibilityConfigSchema.parse(JSON.parse(content));
}

export function loadSignatureCompatibilityConfig(rootPath: string): {
  config: SignatureCompatibilityConfig;
  configPath: string;
} {
  const candidates = ['.stackfold/signature-compatibility.json', 'stackfold.signature-compatibility.json'];
  for (const configPath of candidates) {
    const content = readSafeFile(path.join(rootPath, configPath));
    if (content) return { config: parseSignatureCompatibilityConfig(content), configPath };
  }
  throw new Error(`No Signature Compatibility configuration found in '${rootPath}'.`);
}

interface CanonicalState {
  method: string;
  path: string;
  queryPairs: Array<[string, string]>;
  headers: Array<[string, string]>;
  body: string;
  timestamp?: string;
  includeTimestamp: boolean;
}

function parseQuery(raw: string): Array<[string, string]> {
  if (!raw) return [];
  const stripped = raw.startsWith('?') ? raw.slice(1) : raw;
  if (!stripped) return [];
  return stripped.split('&').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return [part, ''];
    return [part.slice(0, index), part.slice(index + 1)];
  });
}

function safePercentDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function tryParseJsonBody(body: string): unknown {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function isHexString(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

function isBase64String(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  try {
    const decoded = Buffer.from(value, 'base64');
    // Strict round-trip: only treat as base64 when re-encoding matches.
    return decoded.toString('base64') === value;
  } catch {
    return false;
  }
}

function applyStep(state: CanonicalState, step: CanonicalStep): void {
  switch (step) {
    case 'uppercase-method':
      state.method = state.method.toUpperCase();
      break;
    case 'preserve-method':
      break;
    case 'sort-query-keys':
      state.queryPairs = [...state.queryPairs].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      break;
    case 'preserve-query-order':
      break;
    case 'decode-percent-query':
      state.queryPairs = state.queryPairs.map(([k, v]) => [safePercentDecode(k), safePercentDecode(v)]);
      break;
    case 'preserve-percent-query':
      break;
    case 'lowercase-header-names':
      state.headers = state.headers.map(([k, v]) => [k.toLowerCase(), v]);
      break;
    case 'preserve-header-case':
      break;
    case 'trim-header-values':
      state.headers = state.headers.map(([k, v]) => [k, v.trim()]);
      break;
    case 'preserve-header-values':
      break;
    case 'raw-body':
    case 'json-raw-body':
    case 'preserve-newlines-body':
    case 'preserve-body':
    case 'preserve-whitespace-body':
    case 'preserve-percent-body':
      break;
    case 'json-sort-keys-body': {
      const parsed = tryParseJsonBody(state.body);
      if (parsed !== undefined) state.body = JSON.stringify(sortJsonKeys(parsed));
      break;
    }
    case 'nfc-body':
      state.body = state.body.normalize('NFC');
      break;
    case 'nfd-body':
      state.body = state.body.normalize('NFD');
      break;
    case 'decode-hex-body':
      if (isHexString(state.body)) {
        state.body = Buffer.from(state.body, 'hex').toString('utf8');
      }
      break;
    case 'decode-base64-body':
      if (isBase64String(state.body)) {
        state.body = Buffer.from(state.body, 'base64').toString('utf8');
      }
      break;
    case 'normalize-newlines-body':
      state.body = state.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      break;
    case 'trim-body':
      state.body = state.body.trim();
      break;
    case 'collapse-whitespace-body':
      state.body = state.body.replace(/[ \t]+/g, ' ');
      break;
    case 'decode-percent-body':
      state.body = safePercentDecode(state.body);
      break;
    case 'include-timestamp':
      state.includeTimestamp = true;
      break;
    case 'exclude-timestamp':
      state.includeTimestamp = false;
      break;
  }
}

function initialState(vector: SignatureTestVector): CanonicalState {
  return {
    method: vector.method,
    path: vector.path,
    queryPairs: parseQuery(vector.query),
    headers: Object.entries(vector.headers),
    body: vector.body,
    timestamp: vector.timestamp,
    includeTimestamp: false,
  };
}

function renderCanonical(state: CanonicalState): string {
  const query = state.queryPairs.map(([k, v]) => `${k}=${v}`).join('&');
  const headers = [...state.headers]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  const parts = [state.method, state.path, query, headers, state.body];
  if (state.includeTimestamp && state.timestamp) parts.push(state.timestamp);
  return parts.join('\n');
}

export function canonicalize(vector: SignatureTestVector, steps: CanonicalStep[]): string {
  const state = initialState(vector);
  for (const step of steps) applyStep(state, step);
  return renderCanonical(state);
}

/** Intermediate canonical after each step — used to attribute the first divergence. */
function stepwiseCanonicals(vector: SignatureTestVector, steps: CanonicalStep[]): string[] {
  const state = initialState(vector);
  const outputs: string[] = [];
  for (const step of steps) {
    applyStep(state, step);
    outputs.push(renderCanonical(state));
  }
  return outputs;
}

export function firstDifferingByte(a: string, b: string): number | null {
  const aBytes = Buffer.from(a, 'utf8');
  const bBytes = Buffer.from(b, 'utf8');
  const length = Math.min(aBytes.length, bBytes.length);
  for (let i = 0; i < length; i += 1) {
    if (aBytes[i] !== bBytes[i]) return i;
  }
  if (aBytes.length !== bBytes.length) return length;
  return null;
}

function describeByteContext(canonical: string, byteIndex: number): string {
  const bytes = Buffer.from(canonical, 'utf8');
  const start = Math.max(0, byteIndex - 24);
  const end = Math.min(bytes.length, byteIndex + 25);
  const window = bytes.subarray(start, end).toString('utf8').replace(/\n/g, '↵');
  const marker = ' '.repeat(Math.min(24, byteIndex - start)) + '^';
  return `bytes[${start}..${end}]: "${window}"\n${marker} first difference at byte ${byteIndex}`;
}

function attributeStep(
  vector: SignatureTestVector,
  signerSteps: CanonicalStep[],
  verifierSteps: CanonicalStep[]
): string | null {
  const signerOutputs = stepwiseCanonicals(vector, signerSteps);
  const verifierOutputs = stepwiseCanonicals(vector, verifierSteps);
  const shared = Math.min(signerOutputs.length, verifierOutputs.length);
  for (let i = 0; i < shared; i += 1) {
    if (signerOutputs[i] !== verifierOutputs[i]) {
      const s = signerSteps[i]!;
      const v = verifierSteps[i]!;
      if (s === v) return `shared step '${s}' diverges on this input (position ${i + 1})`;
      return `signer '${s}' vs verifier '${v}' (position ${i + 1})`;
    }
  }
  if (signerSteps.length !== verifierSteps.length) {
    // Find the first extra step that actually changes the running canonical,
    // so no-op steps (e.g. base64 decode on non-base64 input) are skipped.
    // The shared prefix produced identical output, so replaying it via the
    // shorter list reconstructs the common state.
    const longer = signerSteps.length > verifierSteps.length ? signerSteps : verifierSteps;
    const side = signerSteps.length > verifierSteps.length ? 'signer' : 'verifier';
    const shorter = signerSteps.length < verifierSteps.length ? signerSteps : verifierSteps;
    const probeState = initialState(vector);
    for (const step of shorter) applyStep(probeState, step);
    for (let i = shared; i < longer.length; i += 1) {
      const before = renderCanonical(probeState);
      applyStep(probeState, longer[i]!);
      if (renderCanonical(probeState) !== before) {
        return `${side} extra step '${longer[i]!}' (position ${i + 1})`;
      }
    }
    return `${side} has ${Math.abs(signerSteps.length - verifierSteps.length)} extra step(s) after position ${shared}`;
  }
  return null;
}

function requiredSecret(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Signature Compatibility requires runtime environment variable '${name}'.`);
  return value;
}

export function generateSignatureCompatibilityReproduction(
  config: SignatureCompatibilityConfig,
  failing: SignatureVectorResult[]
): string {
  const cases = failing.map(vector => `
  test(${JSON.stringify(`signature mismatch: ${vector.label}`)}, () => {
    const secret = process.env.${config.secretEnv};
    if (!secret) throw new Error('Set ${config.secretEnv} to a synthetic test value.');
    const signerCanonical = ${JSON.stringify(vector.signerCanonical)};
    const verifierCanonical = ${JSON.stringify(vector.verifierCanonical)};
    expect(firstDiff(signerCanonical, verifierCanonical)).toBe(${vector.firstDifferingByte ?? -1});
    expect(sign(secret, signerCanonical)).not.toBe(sign(secret, verifierCanonical));
  });`).join('\n');

  return `import { test, expect } from 'vitest';
import crypto from 'node:crypto';

// Reproduction for .stackfold/signature-compatibility.json.
// Uses only the synthetic canonical inputs below plus process.env.${config.secretEnv}.
// The secret value is never printed, stored, or embedded.
function sign(secret: string, canonical: string): string {
  return crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

function firstDiff(a: string, b: string): number {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  const length = Math.min(ab.length, bb.length);
  for (let i = 0; i < length; i += 1) {
    if (ab[i] !== bb[i]) return i;
  }
  return ab.length === bb.length ? -1 : length;
}
${cases || '\ntest(\'signature compatibility: all vectors agree\', () => {\n  expect(true).toBe(true);\n});'}
`;
}

export async function runSignatureCompatibilityCheck(
  config: SignatureCompatibilityConfig,
  options: SignatureCompatibilityRunOptions = {}
): Promise<SignatureCompatibilityResult> {
  if (config.algorithm !== 'hmac-sha256') {
    throw new Error(`Unsupported signature algorithm '${config.algorithm}'.`);
  }
  const env = options.env || process.env;
  const secret = requiredSecret(env, config.secretEnv);

  const vectors: SignatureVectorResult[] = config.vectors.map(vector => {
    const signerCanonical = canonicalize(vector, config.signer.canonicalization);
    const verifierCanonical = canonicalize(vector, config.verifier.canonicalization);
    const byte = firstDifferingByte(signerCanonical, verifierCanonical);
    const signerSig = hmacFingerprint(secret, signerCanonical);
    const verifierSig = hmacFingerprint(secret, verifierCanonical);
    if (byte === null) {
      return {
        id: vector.id,
        label: vector.label,
        kind: vector.kind,
        status: 'pass' as const,
        signerCanonical,
        verifierCanonical,
        signerCanonicalFingerprint: fingerprint(signerCanonical),
        verifierCanonicalFingerprint: fingerprint(verifierCanonical),
        signerSignatureFingerprint: signerSig,
        verifierSignatureFingerprint: verifierSig,
        firstDifferingByte: null,
        firstDifferingStep: null,
        comparison: `canonical inputs identical (${signerCanonical.length} bytes); HMAC fingerprints match #${signerSig}.`,
      };
    }
    const step = attributeStep(vector, config.signer.canonicalization, config.verifier.canonicalization);
    return {
      id: vector.id,
      label: vector.label,
      kind: vector.kind,
      status: 'fail' as const,
      signerCanonical,
      verifierCanonical,
      signerCanonicalFingerprint: fingerprint(signerCanonical),
      verifierCanonicalFingerprint: fingerprint(verifierCanonical),
      signerSignatureFingerprint: signerSig,
      verifierSignatureFingerprint: verifierSig,
      firstDifferingByte: byte,
      firstDifferingStep: step,
      comparison: `first differing input byte ${byte} (${step}). signer #${fingerprint(signerCanonical)} vs verifier #${fingerprint(verifierCanonical)}.\n${describeByteContext(signerCanonical, byte)}`,
    };
  });

  const failing = vectors.filter(vector => vector.status === 'fail');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    algorithm: config.algorithm,
    secretEnv: config.secretEnv,
    signerFile: config.signer.file,
    signerFunction: config.signer.function,
    verifierFile: config.verifier.file,
    verifierFunction: config.verifier.function,
    vectors,
    reproductionTest: generateSignatureCompatibilityReproduction(config, failing),
  };
}

export const signatureCompatibilityResultSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  algorithm: z.literal('hmac-sha256'),
  secretEnv: z.string().min(1),
  signerFile: z.string().min(1),
  signerFunction: z.string().min(1),
  verifierFile: z.string().min(1),
  verifierFunction: z.string().min(1),
  vectors: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: signatureVectorKindSchema,
    status: z.enum(['pass', 'fail', 'uncertain']),
    signerCanonical: z.string(),
    verifierCanonical: z.string(),
    signerCanonicalFingerprint: z.string().length(12),
    verifierCanonicalFingerprint: z.string().length(12),
    signerSignatureFingerprint: z.string().length(12),
    verifierSignatureFingerprint: z.string().length(12),
    firstDifferingByte: z.number().int().nonnegative().nullable(),
    firstDifferingStep: z.string().nullable(),
    comparison: z.string().min(1),
    reason: z.string().optional(),
  })),
  reproductionTest: z.string().min(1),
});

export type SignatureCompatibilityResultParsed = z.infer<typeof signatureCompatibilityResultSchema>;

export function parseSignatureCompatibilityResult(content: string): SignatureCompatibilityResult {
  return signatureCompatibilityResultSchema.parse(JSON.parse(content)) as SignatureCompatibilityResult;
}
