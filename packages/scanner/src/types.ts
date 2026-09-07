import type { ProjectGraph, ScanDiagnostic, GraphBuilder } from '@stackfold/graph';
import type { ScanProgressCallback } from './pipeline/stages';

export interface ScanOptions {
  rootPath: string;
  projectName?: string;
  ignorePatterns?: string[];
  maxFiles?: number;
  verbose?: boolean;
  onProgress?: ScanProgressCallback;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface ScanContext {
  rootPath: string;
  projectName: string;
  builder: GraphBuilder;
  fileList: string[];
  packageJsonFiles: string[];
  tsJsFiles: string[];
  prismaFiles: string[];
  envExampleFiles: string[];
  frameworks: Set<string>;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  diagnostics: ScanDiagnostic[];
  signal?: AbortSignal;
}

export interface DetectorInterface {
  id: string;
  name: string;
  run(context: ScanContext): Promise<void> | void;
}

export interface ScanResult {
  graph: ProjectGraph;
  durationMs: number;
  scannedFilesCount: number;
  diagnostics: ScanDiagnostic[];
  fromCache?: boolean;
}
