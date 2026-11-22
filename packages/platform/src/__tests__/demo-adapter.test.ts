import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaticDemoPlatformAdapter } from '../index';

function stubFetch(routes: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url in routes) return { ok: true, status: 200, json: async () => routes[url] };
      return { ok: false, status: 404, json: async () => ({}) };
    })
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('StaticDemoPlatformAdapter', () => {
  it('serves pre-scanned fixtures from the base path without touching /api', async () => {
    const graph = { nodes: [], edges: [], metadata: { rootPath: '/demo/sample-ecommerce-app' } };
    const calls = stubFetch({
      '/StackFold/demo-data/scan/sample-ecommerce-app.json': {
        graph,
        durationMs: 12,
        scannedFilesCount: 15,
        diagnostics: [],
        canonicalPath: '/demo/sample-ecommerce-app',
      },
    });
    const adapter = new StaticDemoPlatformAdapter({ basePath: '/StackFold/' });
    const result = await adapter.scanRepository({ fixture: 'sample-ecommerce-app' });
    expect(result.scannedFilesCount).toBe(15);
    expect(result.fromCache).toBe(false);
    expect(calls).toEqual(['/StackFold/demo-data/scan/sample-ecommerce-app.json']);
  });

  it('maps a /demo/<fixture> root back to its fixture for scans and Security Lab', async () => {
    const calls = stubFetch({
      '/demo-data/security/queue-compatibility/queue-compatibility-failing.json': { success: true, result: {}, source: 'x' },
    });
    const adapter = new StaticDemoPlatformAdapter();
    const payload = await adapter.runQueueCompatibilityCheck({ rootPath: '/demo/queue-compatibility-failing' });
    expect(payload.success).toBe(true);
    expect(calls[0]).toBe('/demo-data/security/queue-compatibility/queue-compatibility-failing.json');
  });

  it('refuses arbitrary local paths with an explicit demo message', async () => {
    stubFetch({});
    const adapter = new StaticDemoPlatformAdapter();
    const validation = await adapter.validateRepository('/Users/someone/project');
    expect(validation.isValid).toBe(false);
    expect(validation.errorCode).toBe('DEMO_STATIC');
    await expect(adapter.scanRepository({ rootPath: '/Users/someone/project' })).rejects.toThrow(/pre-scanned/);
  });

  it('reports missing security data honestly instead of faking a result', async () => {
    stubFetch({});
    const adapter = new StaticDemoPlatformAdapter();
    const payload = await adapter.loadSignatureCompatibilityRecorded({ fixture: 'tx-escape-prisma' });
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('MISSING_CONFIGURATION');
  });

  it('links "open in editor" to the repository file instead of a local editor URL', async () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    const adapter = new StaticDemoPlatformAdapter({ repositoryUrl: 'https://github.com/o/r', branch: 'main' });
    const result = await adapter.openInEditor('lib/stripe.ts', '/demo/sample-ecommerce-app');
    expect(result.url).toBe('https://github.com/o/r/blob/main/fixtures/sample-ecommerce-app/lib/stripe.ts');
    expect(open).toHaveBeenCalled();
  });
});
