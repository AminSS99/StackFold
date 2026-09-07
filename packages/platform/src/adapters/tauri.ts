import type {
  PlatformAdapter,
  PreferredEditor,
  RecentProjectEntry,
  ScanPlatformParams,
  ScanPlatformResult,
} from '../types';
import type { PathValidationResult, ScanProgress, StackfoldScanArtifact } from '@stackfold/scanner';

// Types for Tauri global window bridge
interface TauriInternals {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

interface TauriEventPayload {
  scanId: string;
  stage: string;
  message: string;
  percentage?: number;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
    __TAURI__?: {
      core?: TauriInternals;
      event?: {
        listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
      };
    };
  }
}

function getTauriInvoke(): (<T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI_INTERNALS__?.invoke) {
    return window.__TAURI_INTERNALS__.invoke;
  }
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke;
  }
  return null;
}

export class TauriPlatformAdapter implements PlatformAdapter {
  readonly id = 'tauri' as const;
  private currentScanId: string | null = null;

  isDesktop(): boolean {
    return true;
  }

  getPlatformName(): 'macos' | 'windows' | 'linux' | 'web' {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) return 'macos';
      if (ua.includes('win')) return 'windows';
      if (ua.includes('linux')) return 'linux';
    }
    return 'macos';
  }

  async selectRepositoryFolder(): Promise<string | null> {
    const invoke = getTauriInvoke();
    if (!invoke) return null;

    try {
      const selected = await invoke<string | null>('select_repository_folder');
      return selected || null;
    } catch (err) {
      console.warn('Native folder picker failed or was cancelled:', err);
      return null;
    }
  }

  async validateRepository(targetPath: string): Promise<PathValidationResult> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return {
        isValid: false,
        hasPackageJson: false,
        hasTsConfig: false,
        hasPrisma: false,
        isMonorepo: false,
        errorCode: 'TAURI_NOT_INITIALIZED',
        errorMessage: 'Tauri runtime bridge not detected',
      };
    }

    try {
      return await invoke<PathValidationResult>('validate_repository_path', {
        path: targetPath,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isValid: false,
        hasPackageJson: false,
        hasTsConfig: false,
        hasPrisma: false,
        isMonorepo: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: msg,
      };
    }
  }

  async scanRepository(
    params: ScanPlatformParams,
    onProgress?: (progress: ScanProgress) => void,
    signal?: AbortSignal
  ): Promise<ScanPlatformResult> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      throw new Error('Tauri native bridge not available');
    }

    const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.currentScanId = scanId;

    let unlisten: (() => void) | null = null;
    if (typeof window !== 'undefined' && window.__TAURI__?.event?.listen) {
      try {
        unlisten = await window.__TAURI__.event.listen<TauriEventPayload>(
          'scan://progress',
          event => {
            if (event.payload.scanId === scanId && onProgress) {
              onProgress({
                stage: event.payload.stage as unknown as ScanProgress['stage'],
                message: event.payload.message,
                percentage: event.payload.percentage,
              });
            }
          }
        );
      } catch {
        // Fallback if event listen fails
      }
    }

    const onAbort = async () => {
      try {
        await invoke('cancel_scan', { scanId });
      } catch {
        // Ignore
      }
    };

    if (signal) {
      if (signal.aborted) {
        throw new Error('Scan aborted by user');
      }
      signal.addEventListener('abort', onAbort);
    }

    try {
      onProgress?.({ stage: 'VALIDATING_PATH', message: 'Starting desktop scanner...' });

      const rawResult = await invoke<{
        graph: ScanPlatformResult['graph'];
        durationMs: number;
        scannedFilesCount: number;
        diagnostics: ScanPlatformResult['diagnostics'];
        fromCache?: boolean;
        canonicalPath?: string;
      }>('execute_scan', {
        params,
        scanId,
      });

      onProgress?.({ stage: 'COMPLETED', message: 'Scan finished successfully' });
      return rawResult;
    } finally {
      if (unlisten) {
        unlisten();
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      if (this.currentScanId === scanId) {
        this.currentScanId = null;
      }
    }
  }

  async cancelScan(): Promise<void> {
    const invoke = getTauriInvoke();
    if (invoke && this.currentScanId) {
      await invoke('cancel_scan', { scanId: this.currentScanId });
      this.currentScanId = null;
    }
  }

  async loadCachedScan(rootPath: string): Promise<StackfoldScanArtifact | null> {
    const invoke = getTauriInvoke();
    if (!invoke) return null;
    try {
      return await invoke<StackfoldScanArtifact | null>('load_cached_scan', { rootPath });
    } catch {
      return null;
    }
  }

  async deleteCachedScan(rootPath: string): Promise<boolean> {
    const invoke = getTauriInvoke();
    if (!invoke) return false;
    try {
      return await invoke<boolean>('delete_cached_scan', { rootPath });
    } catch {
      return false;
    }
  }

  async listRecentProjects(): Promise<RecentProjectEntry[]> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('stackfold_recent_projects_v1');
        return raw ? JSON.parse(raw) : [];
      }
      return [];
    }
    try {
      return await invoke<RecentProjectEntry[]>('list_recent_projects');
    } catch {
      return [];
    }
  }

  async saveRecentProject(entry: RecentProjectEntry): Promise<void> {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        await invoke('save_recent_project', { entry });
      } catch {
        // Ignore
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const recents = await this.listRecentProjects();
        const updated = [entry, ...recents.filter(r => r.path !== entry.path)].slice(0, 10);
        localStorage.setItem('stackfold_recent_projects_v1', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  }

  async removeRecentProject(pathOrId: string): Promise<void> {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        await invoke('remove_recent_project', { path: pathOrId });
      } catch {
        // Ignore
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const recents = await this.listRecentProjects();
        const updated = recents.filter(r => r.path !== pathOrId && r.fixtureId !== pathOrId);
        localStorage.setItem('stackfold_recent_projects_v1', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  }

  async openInEditor(
    filePath: string,
    rootPath: string,
    editor: PreferredEditor = 'vscode'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        return await invoke<{ success: boolean; url?: string; error?: string }>('open_in_editor', {
          filePath,
          rootPath,
          editor,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const cleanFile = filePath.replace(/^\/+/, '');
    const cleanRoot = rootPath.replace(/\/+$/, '');
    const fullPath = `${cleanRoot}/${cleanFile}`;
    const url = `${editor}://file/${fullPath}`;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
    return { success: true, url };
  }

  async openExternalUrl(url: string): Promise<void> {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        await invoke('open_external_url', { url });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async setWindowTitle(title: string): Promise<void> {
    const invoke = getTauriInvoke();
    if (invoke) {
      try {
        await invoke('set_window_title', { title });
      } catch {
        // Fallback
      }
    }
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }
}
