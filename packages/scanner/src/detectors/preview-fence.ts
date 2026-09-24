import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import type { Evidence, SourceRange } from '@stackfold/graph';
import type { DetectorInterface, ScanContext } from '../types';
import { readSafeFile } from '../utils/file-system';

const resourceSchema = z.object({
  provider: z.literal('supabase'),
  type: z.enum(['project', 'database', 'storage']).default('project'),
  identifier: z.string().min(1),
  binding: z.string().min(1),
  classification: z.enum(['production', 'non-production', 'unknown']).default('unknown'),
});

const environmentSchema = z.object({
  provider: z.literal('vercel'),
  name: z.string().min(1),
  kind: z.enum(['production', 'preview', 'development', 'staging']),
  projectId: z.string().min(1),
  resources: z.array(resourceSchema),
});

export const previewFenceConfigSchema = z.object({
  schemaVersion: z.literal(1),
  environments: z.array(environmentSchema).min(1),
});

export type PreviewFenceConfig = z.infer<typeof previewFenceConfigSchema>;

const RULE_ID = 'preview-fence/vercel-supabase-production-boundary';

function fingerprint(identifier: string): string {
  const normalized = identifier.trim().toLowerCase().replace(/\/$/, '');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

function findLineRange(content: string, needle: string, afterNeedle?: string): SourceRange | undefined {
  const lines = content.split('\n');
  const startIndex = afterNeedle
    ? Math.max(0, lines.findIndex(line => line.includes(`"${afterNeedle}"`)))
    : 0;
  const relativeIndex = lines.slice(startIndex).findIndex(line => line.includes(`"${needle}"`));
  const index = relativeIndex < 0 ? -1 : startIndex + relativeIndex;
  if (index < 0) return undefined;
  const column = Math.max(0, lines[index]!.indexOf(`"${needle}"`));
  return {
    startLine: index + 1,
    startColumn: column,
    endLine: index + 1,
    endColumn: column + needle.length + 2,
  };
}

export function parsePreviewFenceConfig(content: string): PreviewFenceConfig {
  return previewFenceConfigSchema.parse(JSON.parse(content));
}

export const previewFenceDetector: DetectorInterface = {
  id: 'preview-fence',
  name: 'PreviewFence: Vercel to Supabase environment safety',

  run(context: ScanContext) {
    for (const configPath of context.previewFenceConfigFiles) {
      const content = readSafeFile(path.join(context.rootPath, configPath));
      if (!content) continue;

      let config: PreviewFenceConfig;
      try {
        config = parsePreviewFenceConfig(content);
      } catch (error) {
        context.diagnostics.push({
          level: 'warning',
          code: 'PREVIEW_FENCE_INVALID_CONFIG',
          message: `PreviewFence skipped invalid configuration at '${configPath}'.`,
          filePath: configPath,
          details: { reason: error instanceof Error ? error.message : String(error) },
        });
        continue;
      }

      const productionFingerprints = new Set(
        config.environments
          .filter(environment => environment.kind === 'production')
          .flatMap(environment => environment.resources)
          .map(resource => fingerprint(resource.identifier))
      );

      for (const environment of config.environments) {
        const envEvidence: Evidence = {
          detectorId: previewFenceDetector.id,
          rule: 'vercel-environment-manifest',
          filePath: configPath,
          sourceRange: findLineRange(content, environment.name),
          codeSnippet: `Vercel ${environment.kind} environment: ${environment.name}`,
          notes: 'Loaded from a local safe-identifier manifest; no environment secret values were read.',
        };
        const envNode = context.builder.createAndAddNode({
          type: 'deployment_environment',
          key: `vercel:${environment.projectId}:${environment.name}`,
          displayName: environment.name,
          filePath: configPath,
          sourceRange: envEvidence.sourceRange,
          metadata: {
            provider: 'Vercel',
            environmentKind: environment.kind,
            projectFingerprint: fingerprint(environment.projectId),
          },
          evidence: envEvidence,
          tags: ['preview-fence', 'vercel', environment.kind],
        });

        for (const resource of environment.resources) {
          const resourceFingerprint = fingerprint(resource.identifier);
          const sharedWithProduction = productionFingerprints.has(resourceFingerprint);
          const crossesProductionBoundary =
            environment.kind !== 'production' &&
            (resource.classification === 'production' || sharedWithProduction);
          const resourceEvidence: Evidence = {
            detectorId: previewFenceDetector.id,
            rule: 'supabase-resource-identifier',
            filePath: configPath,
            sourceRange: findLineRange(content, resource.binding, environment.name),
            codeSnippet: `${resource.binding} -> Supabase ${resource.type} #${resourceFingerprint}`,
            notes: 'The provider identifier is normalized and one-way fingerprinted before entering the graph.',
          };
          const resourceNode = context.builder.createAndAddNode({
            type: 'cloud_resource',
            key: `supabase:${resource.type}:${resourceFingerprint}`,
            displayName: `Supabase #${resourceFingerprint.slice(0, 8)}`,
            filePath: configPath,
            sourceRange: resourceEvidence.sourceRange,
            metadata: {
              provider: 'Supabase',
              resourceType: resource.type,
              identifierFingerprint: resourceFingerprint,
              classification: resource.classification,
              findingCount: crossesProductionBoundary ? 1 : 0,
            },
            evidence: resourceEvidence,
            confidence: resource.classification === 'unknown' ? 'MEDIUM' : 'HIGH',
            tags: [
              'preview-fence',
              'supabase',
              resource.type,
              crossesProductionBoundary ? 'risk' : 'safe',
            ],
          });

          context.builder.createAndAddEdge({
            source: envNode.id,
            target: resourceNode.id,
            type: 'binds_to',
            metadata: {
              binding: resource.binding,
              crossesProductionBoundary,
            },
            evidence: {
              ...resourceEvidence,
              rule: 'vercel-environment-binds-supabase-resource',
            },
            confidence: sharedWithProduction || resource.classification !== 'unknown' ? 'HIGH' : 'MEDIUM',
          });

          if (!crossesProductionBoundary) continue;

          const findingId = `finding:${RULE_ID}:${envNode.id}:${resourceNode.id}`;
          context.builder.addFinding({
            id: findingId,
            ruleId: RULE_ID,
            severity: 'high',
            status: 'confirmed',
            title: `PreviewFence: ${environment.kind} Vercel environment is bound to a production Supabase resource`,
            affectedNodeIds: [envNode.id, resourceNode.id],
            sourceLocation: {
              filePath: configPath,
              sourceRange: resourceEvidence.sourceRange,
            },
            evidence: [envEvidence, resourceEvidence],
            explanation:
              sharedWithProduction
                ? `The same fingerprinted Supabase ${resource.type} identifier is bound to both '${environment.name}' and a production Vercel environment. Preview or development activity can therefore mutate or expose production data.`
                : `The '${environment.name}' Vercel environment is explicitly bound to a Supabase ${resource.type} classified as production. Preview or development activity can therefore mutate or expose production data.`,
            suggestedAction:
              `Provision a non-production Supabase ${resource.type}, update only the '${environment.name}' Vercel binding '${resource.binding}', and verify migrations and webhooks before redeploying.`,
            metadata: {
              analyzer: 'PreviewFence',
              environmentProvider: 'vercel',
              resourceProvider: 'supabase',
              binding: resource.binding,
              identifierFingerprint: resourceFingerprint,
            },
          });
        }
      }
    }
  },
};
