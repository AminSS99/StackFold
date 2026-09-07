import { z } from 'zod';
import { projectGraphSchema, scanDiagnosticSchema } from '@stackfold/graph';
import type { ProjectGraph, ScanDiagnostic } from '@stackfold/graph';

export interface StackfoldScanArtifact {
  schemaVersion: '1.0.0';
  scannerVersion: string;
  rootPath: string;
  projectName: string;
  scannedAt: string;
  durationMs: number;
  scannedFilesCount: number;
  fileFingerprint: string;
  graph: ProjectGraph;
  diagnostics: ScanDiagnostic[];
}

export const scanArtifactSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  scannerVersion: z.string().min(1),
  rootPath: z.string().min(1),
  projectName: z.string().min(1),
  scannedAt: z.string(),
  durationMs: z.number().nonnegative(),
  scannedFilesCount: z.number().int().nonnegative(),
  fileFingerprint: z.string().min(1),
  graph: projectGraphSchema,
  diagnostics: z.array(scanDiagnosticSchema),
});

export function validateScanArtifact(data: unknown): StackfoldScanArtifact {
  return scanArtifactSchema.parse(data) as unknown as StackfoldScanArtifact;
}
