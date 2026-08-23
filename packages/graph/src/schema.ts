import { z } from 'zod';
import type {
  NodeType,
  EdgeType,
  ConfidenceLevel,
  DiagnosticSeverity,
  GraphNode,
  GraphEdge,
  ProjectGraph,
} from './types';

export const nodeTypeEnum = z.enum([
  'repository',
  'application',
  'package',
  'directory',
  'source_module',
  'component',
  'api_route',
  'function',
  'database_model',
  'environment_variable',
  'external_service',
]);

export const edgeTypeEnum = z.enum([
  'contains',
  'imports',
  'calls',
  'exposes',
  'reads',
  'writes',
  'depends_on',
  'configured_by',
  'communicates_with',
]);

export const confidenceLevelEnum = z.enum([
  'HIGH',
  'MEDIUM',
  'LOW',
]);

export const diagnosticSeverityEnum = z.enum([
  'error',
  'warning',
  'info',
]);

export const sourceRangeSchema = z.object({
  startLine: z.number().int().min(1),
  startColumn: z.number().int().min(0),
  endLine: z.number().int().min(1),
  endColumn: z.number().int().min(0),
});

export const evidenceSchema = z.object({
  filePath: z.string().optional(),
  sourceRange: sourceRangeSchema.optional(),
  codeSnippet: z.string().optional(),
  detectorId: z.string(),
  rule: z.string(),
  notes: z.string().optional(),
});

export const graphNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
  displayName: z.string().min(1),
  filePath: z.string().optional(),
  sourceRange: sourceRangeSchema.optional(),
  metadata: z.record(z.unknown()),
  evidence: evidenceSchema,
  confidence: confidenceLevelEnum,
  tags: z.array(z.string()),
});

export const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: edgeTypeEnum,
  metadata: z.record(z.unknown()).optional(),
  evidence: evidenceSchema,
  confidence: confidenceLevelEnum,
});

export const scanDiagnosticSchema = z.object({
  level: diagnosticSeverityEnum,
  code: z.string(),
  message: z.string(),
  filePath: z.string().optional(),
  sourceRange: sourceRangeSchema.optional(),
  details: z.record(z.unknown()).optional(),
});

export const graphStatsSchema = z.object({
  nodeCount: z.number().int().min(0),
  edgeCount: z.number().int().min(0),
  nodeTypeCounts: z.record(z.string(), z.number().int().min(0)),
  edgeTypeCounts: z.record(z.string(), z.number().int().min(0)),
});

export const graphMetadataSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  generatedAt: z.string(),
  rootPath: z.string(),
  projectName: z.string(),
  packageManager: z.enum(['pnpm', 'npm', 'yarn', 'bun', 'unknown']).optional(),
  frameworks: z.array(z.string()),
  stats: graphStatsSchema,
});

export const projectGraphSchema = z.object({
  metadata: graphMetadataSchema,
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  diagnostics: z.array(scanDiagnosticSchema),
});

export function validateProjectGraph(data: unknown): ProjectGraph {
  return projectGraphSchema.parse(data) as unknown as ProjectGraph;
}
