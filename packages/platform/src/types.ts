import type { ProjectGraph, ScanDiagnostic } from '@stackfold/graph';
import type { PathValidationResult, ScanProgress, StackfoldScanArtifact } from '@stackfold/scanner';

export type PreferredEditor = 'vscode' | 'cursor' | 'webstorm' | 'system';

export interface RecentProjectEntry {
  path: string;
  name: string;
  lastScanned: string;
  nodeCount: number;
  isFixture?: boolean;
  fixtureId?: string;
}

export interface ScanPlatformParams {
  rootPath?: string;
  fixture?: string;
  projectName?: string;
  useCache?: boolean;
  maxFiles?: number;
}

export interface ScanPlatformResult {
  graph: ProjectGraph;
  durationMs: number;
  scannedFilesCount: number;
  diagnostics: ScanDiagnostic[];
  fromCache?: boolean;
  canonicalPath?: string;
}

export interface CacheIsolationPlatformRequest {
  rootPath?: string;
  fixture?: string;
}

export interface CacheIsolationPlatformPayload {
  success: boolean;
  result?: unknown;
  source?: string;
  configPath?: string;
  error?: string;
  code?: string;
}

export interface SignatureCompatibilityPlatformRequest {
  rootPath?: string;
  fixture?: string;
}

export interface SignatureCompatibilityPlatformPayload {
  success: boolean;
  result?: unknown;
  source?: string;
  configPath?: string;
  error?: string;
  code?: string;
}

export interface PlatformAdapter {
  readonly id: 'web' | 'tauri' | 'mock';
  isDesktop(): boolean;
  getPlatformName(): 'macos' | 'windows' | 'linux' | 'web';
  selectRepositoryFolder(): Promise<string | null>;
  validateRepository(targetPath: string): Promise<PathValidationResult>;
  scanRepository(
    params: ScanPlatformParams,
    onProgress?: (progress: ScanProgress) => void,
    signal?: AbortSignal
  ): Promise<ScanPlatformResult>;
  cancelScan(): Promise<void>;
  loadCachedScan(rootPath: string): Promise<StackfoldScanArtifact | null>;
  deleteCachedScan(rootPath: string): Promise<boolean>;
  listRecentProjects(): Promise<RecentProjectEntry[]>;
  saveRecentProject(entry: RecentProjectEntry): Promise<void>;
  removeRecentProject(pathOrId: string): Promise<void>;
  openInEditor(
    filePath: string,
    rootPath: string,
    editor?: PreferredEditor
  ): Promise<{ success: boolean; url?: string; error?: string }>;
  openExternalUrl(url: string): Promise<void>;
  setWindowTitle(title: string): Promise<void>;
  loadCacheIsolationRecorded(request: CacheIsolationPlatformRequest): Promise<CacheIsolationPlatformPayload>;
  runCacheIsolationProbe(request: CacheIsolationPlatformRequest): Promise<CacheIsolationPlatformPayload>;
  loadSignatureCompatibilityRecorded(request: SignatureCompatibilityPlatformRequest): Promise<SignatureCompatibilityPlatformPayload>;
  runSignatureCompatibilityProbe(request: SignatureCompatibilityPlatformRequest): Promise<SignatureCompatibilityPlatformPayload>;
}
