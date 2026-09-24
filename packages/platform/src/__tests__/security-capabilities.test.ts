import { describe, expect, it, beforeEach } from 'vitest';
import {
  MockPlatformAdapter,
  TauriPlatformAdapter,
  WebPlatformAdapter,
  setGlobalPlatformAdapter,
} from '../index';

describe('Security platform capabilities (Cache Isolation selection)', () => {
  beforeEach(() => {
    setGlobalPlatformAdapter(null);
  });

  it('mock adapter reports explicit unavailability without touching the network', async () => {
    const adapter = new MockPlatformAdapter();
    const recorded = await adapter.loadCacheIsolationRecorded({ fixture: 'cache-isolation-vulnerable' });
    expect(recorded.success).toBe(false);
    expect(recorded.code).toBe('MOCK_UNAVAILABLE');
    const live = await adapter.runCacheIsolationProbe({ rootPath: '/tmp/project' });
    expect(live.success).toBe(false);
    expect(live.code).toBe('MOCK_UNAVAILABLE');
    const sigRecorded = await adapter.loadSignatureCompatibilityRecorded({ fixture: 'signature-compatibility-vulnerable' });
    expect(sigRecorded.success).toBe(false);
    const sigLive = await adapter.runSignatureCompatibilityProbe({ rootPath: '/tmp/project' });
    expect(sigLive.success).toBe(false);
  });

  it('tauri adapter without a desktop bridge returns actionable unavailability', async () => {
    const adapter = new TauriPlatformAdapter();
    expect(adapter.isDesktop()).toBe(true);
    const recorded = await adapter.loadCacheIsolationRecorded({ rootPath: '/tmp/project' });
    expect(recorded.success).toBe(false);
    expect(recorded.code).toBe('TAURI_NOT_INITIALIZED');
    const live = await adapter.runCacheIsolationProbe({ fixture: 'cache-isolation-vulnerable' });
    expect(live.success).toBe(false);
    expect(live.code).toBe('TAURI_NOT_INITIALIZED');
  });

  it('web adapter targets the explicit platform capability endpoints', async () => {
    const seen: string[] = [];
    const originalFetch = globalThis.fetch;
    (globalThis as unknown as { fetch: unknown }).fetch = async (input: unknown) => {
      seen.push(String(input));
      return { json: async () => ({ success: false, error: 'stubbed', code: 'STUB' }) } as unknown as Response;
    };
    try {
      const adapter = new WebPlatformAdapter();
      await adapter.loadCacheIsolationRecorded({ rootPath: '/tmp/project' });
      await adapter.runCacheIsolationProbe({ fixture: 'cache-isolation-vulnerable' });
      await adapter.loadSignatureCompatibilityRecorded({ rootPath: '/tmp/project' });
      await adapter.runSignatureCompatibilityProbe({ fixture: 'signature-compatibility-passing' });
      expect(seen.some(url => url.includes('/api/security/cache-isolation?rootPath='))).toBe(true);
      expect(seen.some(url => url.includes('/api/security/signature-compatibility?rootPath='))).toBe(true);
      // Live probes route through the platform capability, never raw browser fs/process.
      expect(seen.filter(url => url.includes('/api/security/cache-isolation')).length).toBeGreaterThanOrEqual(2);
    } finally {
      (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
    }
  });
});
