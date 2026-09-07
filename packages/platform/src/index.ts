import type { PlatformAdapter } from './types';
import { WebPlatformAdapter } from './adapters/web';
import { TauriPlatformAdapter } from './adapters/tauri';
import { MockPlatformAdapter } from './adapters/mock';

export * from './types';
export { WebPlatformAdapter } from './adapters/web';
export { TauriPlatformAdapter } from './adapters/tauri';
export { MockPlatformAdapter } from './adapters/mock';

let activePlatformAdapter: PlatformAdapter | null = null;

export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export function getPlatformAdapter(): PlatformAdapter {
  if (activePlatformAdapter) {
    return activePlatformAdapter;
  }

  if (isTauriEnvironment()) {
    activePlatformAdapter = new TauriPlatformAdapter();
  } else {
    activePlatformAdapter = new WebPlatformAdapter();
  }

  return activePlatformAdapter;
}

export function setGlobalPlatformAdapter(adapter: PlatformAdapter | null): void {
  activePlatformAdapter = adapter;
}
