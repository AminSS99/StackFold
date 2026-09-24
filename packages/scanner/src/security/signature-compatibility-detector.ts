import path from 'node:path';
import type { Evidence, SourceRange } from '@stackfold/graph';
import type { DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';
import {
  parseSignatureCompatibilityConfig,
  parseSignatureCompatibilityResult,
} from './signature-compatibility';

const MISMATCH_RULE_ID = 'security/signature-compatibility/canonical-mismatch';
const UNCERTAIN_RULE_ID = 'security/signature-compatibility/unsupported-or-uncertain';

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

export const signatureCompatibilityDetector: DetectorInterface = {
  id: 'signature-compatibility',
  name: 'Signature Compatibility: signer/verifier normalization analysis',

  run(context) {
    const configPath = context.signatureCompatibilityConfigFiles[0];
    const resultPath = context.signatureCompatibilityResultFiles[0];
    if (!configPath || !resultPath) return;

    const configContent = readSafeFile(path.join(context.rootPath, configPath));
    const resultContent = readSafeFile(path.join(context.rootPath, resultPath));
    if (!configContent || !resultContent) return;

    try {
      const config = parseSignatureCompatibilityConfig(configContent);
      const result = parseSignatureCompatibilityResult(resultContent);

      const adapterEvidence: Evidence = {
        detectorId: 'signature-compatibility',
        rule: 'configured-signer-verifier-adapters',
        filePath: configPath,
        codeSnippet: `signer ${config.signer.file}#${config.signer.function} vs verifier ${config.verifier.file}#${config.verifier.function} (${config.algorithm})`,
        notes: 'Only adapter file references and the secret environment-variable name are recorded; secret values are excluded.',
      };

      const signerNode = context.builder.createAndAddNode({
        type: 'signer',
        key: `signature-compatibility:${config.signer.file}`,
        displayName: `Signer ${config.signer.file}`,
        filePath: config.signer.file,
        metadata: {
          file: config.signer.file,
          function: config.signer.function,
          algorithm: config.algorithm,
          canonicalization: config.signer.canonicalization,
        },
        evidence: adapterEvidence,
        tags: ['signature-compatibility', 'signer'],
      });

      const verifierNode = context.builder.createAndAddNode({
        type: 'verifier',
        key: `signature-compatibility:${config.verifier.file}`,
        displayName: `Verifier ${config.verifier.file}`,
        filePath: config.verifier.file,
        metadata: {
          file: config.verifier.file,
          function: config.verifier.function,
          algorithm: config.algorithm,
          canonicalization: config.verifier.canonicalization,
        },
        evidence: adapterEvidence,
        tags: ['signature-compatibility', 'verifier'],
      });

      for (const vector of result.vectors) {
        const vectorRange = findRange(resultContent, vector.id);
        const vectorEvidence: Evidence = {
          detectorId: 'signature-compatibility',
          rule: 'signature-test-vector',
          filePath: resultPath,
          sourceRange: vectorRange,
          codeSnippet: `${vector.kind} ${vector.label}: ${vector.status}`,
          notes: `Signer canonical #${vector.signerCanonicalFingerprint}; verifier canonical #${vector.verifierCanonicalFingerprint}. ${vector.firstDifferingStep || 'No normalization divergence.'}`,
        };
        const vectorNode = context.builder.createAndAddNode({
          type: 'signature_vector',
          key: `signature-compatibility:${vector.id}`,
          displayName: vector.label,
          filePath: resultPath,
          sourceRange: vectorRange,
          metadata: {
            vectorId: vector.id,
            kind: vector.kind,
            status: vector.status,
            firstDifferingByte: vector.firstDifferingByte,
            firstDifferingStep: vector.firstDifferingStep,
          },
          evidence: vectorEvidence,
          tags: ['signature-compatibility', 'test-vector', vector.status],
        });
        context.builder.createAndAddEdge({ source: signerNode.id, target: vectorNode.id, type: 'signs', evidence: vectorEvidence });
        context.builder.createAndAddEdge({ source: verifierNode.id, target: vectorNode.id, type: 'verifies', evidence: vectorEvidence });

        if (vector.status === 'pass') continue;

        const isConfirmed = vector.status === 'fail';
        const ruleId = isConfirmed ? MISMATCH_RULE_ID : UNCERTAIN_RULE_ID;
        const findingId = `finding:${ruleId}:${vector.id}`;
        const boundaryNode = context.builder.createAndAddNode({
          type: 'risk_boundary',
          key: `${ruleId}:${vector.id}`,
          displayName: isConfirmed ? 'Signature verification fails' : 'Signature compatibility uncertain',
          filePath: resultPath,
          sourceRange: vectorRange,
          metadata: {
            ruleId,
            severity: isConfirmed ? 'high' : 'medium',
            status: isConfirmed ? 'confirmed' : 'uncertain',
            vectorId: vector.id,
            kind: vector.kind,
            firstDifferingByte: vector.firstDifferingByte,
            firstDifferingStep: vector.firstDifferingStep,
            findingId,
          },
          evidence: vectorEvidence,
          tags: ['security', 'signature-compatibility', 'risk', isConfirmed ? 'confirmed-mismatch' : 'uncertain'],
        });
        context.builder.createAndAddEdge({
          source: vectorNode.id,
          target: boundaryNode.id,
          type: 'traces_to',
          evidence: vectorEvidence,
        });
        context.builder.createAndAddEdge({
          source: boundaryNode.id,
          target: verifierNode.id,
          type: 'violates',
          evidence: vectorEvidence,
        });

        context.builder.addFinding({
          id: findingId,
          ruleId,
          severity: isConfirmed ? 'high' : 'medium',
          status: isConfirmed ? 'confirmed' : 'uncertain',
          title: isConfirmed
            ? `Signature Compatibility: verifier rejects signer output for '${vector.label}' (${vector.kind})`
            : `Signature Compatibility: '${vector.label}' (${vector.kind}) could not be decided`,
          affectedNodeIds: [signerNode.id, verifierNode.id, vectorNode.id, boundaryNode.id],
          sourceLocation: { filePath: resultPath, sourceRange: vectorRange },
          evidence: [adapterEvidence, vectorEvidence],
          explanation: isConfirmed
            ? `The signer canonicalized '${vector.label}' differently from the verifier, so HMAC-SHA256 verification fails. First differing input byte ${vector.firstDifferingByte} (${vector.firstDifferingStep}). Signer fingerprint #${vector.signerCanonicalFingerprint}; verifier fingerprint #${vector.verifierCanonicalFingerprint}.`
            : `The '${vector.label}' vector (${vector.kind}) is unsupported or undecidable with the configured adapters: ${vector.reason || 'no comparable canonical inputs'}. Treat as uncertain, not proof of failure.`,
          suggestedAction: isConfirmed
            ? `Align one normalization step so both sides sign the same bytes (see first differing step), then re-run the generated reproduction with a synthetic secret before closing this finding.`
            : `Add explicit adapter support or a narrower test vector for this case, then re-run the check.`,
          metadata: {
            analyzer: 'Signature Compatibility',
            algorithm: result.algorithm,
            kind: vector.kind,
            vectorId: vector.id,
            status: vector.status,
            exactComparison: vector.comparison,
            firstDifferingByte: vector.firstDifferingByte,
            firstDifferingStep: vector.firstDifferingStep,
            signerCanonicalFingerprint: vector.signerCanonicalFingerprint,
            verifierCanonicalFingerprint: vector.verifierCanonicalFingerprint,
            secretEnv: result.secretEnv,
            reproductionFramework: 'vitest',
            reproductionTest: result.reproductionTest,
          },
        });
      }
    } catch (error) {
      context.diagnostics.push({
        level: 'warning',
        code: 'SIGNATURE_COMPATIBILITY_INVALID_RESULT',
        message: `Signature Compatibility skipped invalid configuration or results at '${resultPath}'.`,
        filePath: resultPath,
        details: { reason: error instanceof Error ? error.message : String(error) },
      });
    }
  },
};
