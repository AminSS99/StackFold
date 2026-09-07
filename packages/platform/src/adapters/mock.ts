import type {
  PlatformAdapter,
  PreferredEditor,
  RecentProjectEntry,
  ScanPlatformParams,
  ScanPlatformResult,
} from '../types';
import type { PathValidationResult, ScanProgress, StackfoldScanArtifact } from '@stackfold/scanner';
import { GraphBuilder } from '@stackfold/graph';

export class MockPlatformAdapter implements PlatformAdapter {
  readonly id = 'mock' as const;
  public mockFolderToSelect: string | null = '/mock/workspace/project';
  public mockValidationResult: PathValidationResult = {
    isValid: true,
    canonicalPath: '/mock/workspace/project',
    projectName: 'mock-project',
    hasPackageJson: true,
    hasTsConfig: true,
    hasPrisma: true,
    isMonorepo: false,
  };
  public mockRecentProjects: RecentProjectEntry[] = [];
  public mockCachedScans: Map<string, StackfoldScanArtifact> = new Map();
  public windowTitle = 'Stackfold (Mock)';
  public lastOpenedEditorUrl: string | null = null;
  public lastOpenedExternalUrl: string | null = null;
  public aborted = false;

  isDesktop(): boolean {
    return false;
  }

  getPlatformName(): 'macos' | 'windows' | 'linux' | 'web' {
    return 'web';
  }

  async selectRepositoryFolder(): Promise<string | null> {
    return this.mockFolderToSelect;
  }

  async validateRepository(targetPath: string): Promise<PathValidationResult> {
    if (targetPath.includes('invalid') || targetPath.trim() === '') {
      return {
        isValid: false,
        hasPackageJson: false,
        hasTsConfig: false,
        hasPrisma: false,
        isMonorepo: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Invalid mock path',
      };
    }
    return {
      ...this.mockValidationResult,
      canonicalPath: targetPath,
      projectName: targetPath.split('/').filter(Boolean).pop() || 'project',
    };
  }

  async scanRepository(
    params: ScanPlatformParams,
    onProgress?: (progress: ScanProgress) => void,
    signal?: AbortSignal
  ): Promise<ScanPlatformResult> {
    this.aborted = false;

    if (signal?.aborted) {
      this.aborted = true;
      throw new Error('Scan aborted by user');
    }

    onProgress?.({ stage: 'VALIDATING_PATH', message: 'Validating mock path...' });
    onProgress?.({ stage: 'DISCOVERING_FILES', message: 'Discovering mock files...' });
    onProgress?.({ stage: 'BUILDING_NORMALIZED_GRAPH', message: 'Building mock graph...' });

    if (signal?.aborted) {
      this.aborted = true;
      throw new Error('Scan aborted by user');
    }

    const builder = new GraphBuilder();
    const app = builder.createAndAddNode({
      type: 'application',
      key: 'apps/mock',
      displayName: params.projectName || 'Mock App',
      filePath: 'package.json',
      evidence: { detectorId: 'mock', rule: 'mock-app' },
    });

    const route = builder.createAndAddNode({
      type: 'api_route',
      key: 'app/api/hello:GET',
      displayName: 'GET /api/hello',
      filePath: 'app/api/hello/route.ts',
      evidence: { detectorId: 'mock', rule: 'mock-route' },
    });

    builder.createAndAddEdge({
      source: app.id,
      target: route.id,
      type: 'exposes',
      evidence: { detectorId: 'mock', rule: 'mock-edge' },
    });

    const graph = builder.build({
      rootPath: params.rootPath || '/mock/workspace/project',
      projectName: params.projectName || 'mock-project',
    });

    onProgress?.({ stage: 'COMPLETED', message: 'Mock scan finished' });

    return {
      graph,
      durationMs: 42,
      scannedFilesCount: 12,
      diagnostics: [],
      fromCache: false,
      canonicalPath: params.rootPath || '/mock/workspace/project',
    };
  }

  async cancelScan(): Promise<void> {
    this.aborted = true;
  }

  async loadCachedScan(rootPath: string): Promise<StackfoldScanArtifact | null> {
    return this.mockCachedScans.get(rootPath) || null;
  }

  async deleteCachedScan(rootPath: string): Promise<boolean> {
    return this.mockCachedScans.delete(rootPath);
  }

  async listRecentProjects(): Promise<RecentProjectEntry[]> {
    return [...this.mockRecentProjects];
  }

  async saveRecentProject(entry: RecentProjectEntry): Promise<void> {
    this.mockRecentProjects = [
      entry,
      ...this.mockRecentProjects.filter(r => r.path !== entry.path),
    ].slice(0, 10);
  }

  async removeRecentProject(pathOrId: string): Promise<void> {
    this.mockRecentProjects = this.mockRecentProjects.filter(
      r => r.path !== pathOrId && r.fixtureId !== pathOrId
    );
  }

  async openInEditor(
    filePath: string,
    rootPath: string,
    editor: PreferredEditor = 'vscode'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const cleanFile = filePath.replace(/^\/+/, '');
    const cleanRoot = rootPath.replace(/\/+$/, '');
    const fullPath = `${cleanRoot}/${cleanFile}`;
    const url = `${editor}://file/${fullPath}`;
    this.lastOpenedEditorUrl = url;
    return { success: true, url };
  }

  async openExternalUrl(url: string): Promise<void> {
    this.lastOpenedExternalUrl = url;
  }

  async setWindowTitle(title: string): Promise<void> {
    this.windowTitle = title;
  }
}
