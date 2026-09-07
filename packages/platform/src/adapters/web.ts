import type {
  PlatformAdapter,
  PreferredEditor,
  RecentProjectEntry,
  ScanPlatformParams,
  ScanPlatformResult,
} from '../types';
import type { PathValidationResult, ScanProgress, StackfoldScanArtifact } from '@stackfold/scanner';

const RECENT_PROJECTS_STORAGE_KEY = 'stackfold_recent_projects_v1';

export class WebPlatformAdapter implements PlatformAdapter {
  readonly id = 'web' as const;
  private currentAbortController: AbortController | null = null;

  isDesktop(): boolean {
    return false;
  }

  getPlatformName(): 'macos' | 'windows' | 'linux' | 'web' {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) return 'macos';
      if (ua.includes('win')) return 'windows';
      if (ua.includes('linux')) return 'linux';
    }
    return 'web';
  }

  async selectRepositoryFolder(): Promise<string | null> {
    // In web browser without Tauri native dialog, prompt user or return null to use manual input
    return null;
  }

  async validateRepository(targetPath: string): Promise<PathValidationResult> {
    try {
      const res = await fetch('/api/validate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath }),
      });
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Path validation failed';
      return {
        isValid: false,
        hasPackageJson: false,
        hasTsConfig: false,
        hasPrisma: false,
        isMonorepo: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: msg,
      };
    }
  }

  async scanRepository(
    params: ScanPlatformParams,
    onProgress?: (progress: ScanProgress) => void,
    signal?: AbortSignal
  ): Promise<ScanPlatformResult> {
    this.currentAbortController = new AbortController();

    const forwardAbort = () => {
      this.currentAbortController?.abort();
    };

    if (signal) {
      if (signal.aborted) {
        throw new Error('Scan aborted by user');
      }
      signal.addEventListener('abort', forwardAbort);
    }

    try {
      onProgress?.({ stage: 'VALIDATING_PATH', message: 'Sending scan request...' });

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: this.currentAbortController.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Scan failed with status ${res.status}`);
      }

      onProgress?.({ stage: 'COMPLETED', message: 'Scan complete' });

      return {
        graph: data.graph,
        durationMs: data.durationMs,
        scannedFilesCount: data.scannedFilesCount,
        diagnostics: data.diagnostics || [],
        fromCache: data.fromCache ?? false,
        canonicalPath: data.canonicalPath,
      };
    } finally {
      if (signal) {
        signal.removeEventListener('abort', forwardAbort);
      }
      this.currentAbortController = null;
    }
  }

  async cancelScan(): Promise<void> {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  async loadCachedScan(rootPath: string): Promise<StackfoldScanArtifact | null> {
    try {
      const res = await fetch('/api/cache');
      if (!res.ok) return null;
      const data = await res.json();
      return data.cachedScans?.find((s: StackfoldScanArtifact) => s.rootPath === rootPath) || null;
    } catch {
      return null;
    }
  }

  async deleteCachedScan(rootPath: string): Promise<boolean> {
    try {
      const res = await fetch('/api/cache', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath }),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  async listRecentProjects(): Promise<RecentProjectEntry[]> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveRecentProject(entry: RecentProjectEntry): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const recents = await this.listRecentProjects();
      const filtered = recents.filter(
        r => r.path !== entry.path && (!entry.fixtureId || r.fixtureId !== entry.fixtureId)
      );
      const updated = [entry, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  async removeRecentProject(pathOrId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const recents = await this.listRecentProjects();
      const updated = recents.filter(r => r.path !== pathOrId && r.fixtureId !== pathOrId);
      localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  async openInEditor(
    filePath: string,
    rootPath: string,
    editor: PreferredEditor = 'vscode'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const cleanFile = filePath.replace(/^\/+/, '');
    const cleanRoot = rootPath.replace(/\/+$/, '');
    const fullPath = `${cleanRoot}/${cleanFile}`;

    let url: string;
    switch (editor) {
      case 'cursor':
        url = `cursor://file/${fullPath}`;
        break;
      case 'webstorm':
        url = `webstorm://open?file=${encodeURIComponent(fullPath)}`;
        break;
      case 'vscode':
      default:
        url = `vscode://file/${fullPath}`;
        break;
    }

    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
    return { success: true, url };
  }

  async openExternalUrl(url: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async setWindowTitle(title: string): Promise<void> {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }
}
