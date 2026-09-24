import { describe, expect, it } from 'vitest';
import {
  parseCacheIsolationConfig,
  runCacheIsolationProbe,
  type CacheIsolationConfig,
  type PlaywrightModuleLike,
} from '../security/cache-isolation';

const baseConfig: CacheIsolationConfig = {
  schemaVersion: 1,
  baseUrl: 'http://127.0.0.1:4178',
  environment: 'test',
  authentication: {
    kind: 'header',
    headerName: 'x-stackfold-test-session',
    sessionAEnv: 'STACKFOLD_SESSION_A',
    sessionBEnv: 'STACKFOLD_SESSION_B',
  },
  markers: {
    sessionAMarkerEnv: 'STACKFOLD_MARKER_A',
    sessionBMarkerEnv: 'STACKFOLD_MARKER_B',
  },
  probes: [
    { id: 'private-html', label: 'HTML dashboard', kind: 'html', path: '/dashboard' },
    { id: 'private-json', label: 'JSON identity endpoint', kind: 'json', path: '/api/me' },
  ],
};

const env = {
  STACKFOLD_SESSION_A: 'synthetic-session-alpha',
  STACKFOLD_SESSION_B: 'synthetic-session-beta',
  STACKFOLD_MARKER_A: 'synthetic-marker-alpha',
  STACKFOLD_MARKER_B: 'synthetic-marker-beta',
};

function fakePlaywright(sessionBSeesMarkerA: boolean): PlaywrightModuleLike {
  const pageFor = (headers: Record<string, string>) => ({
    goto: async () => ({
      status: () => 200,
      text: async () => {
        const session = headers['x-stackfold-test-session'];
        if (session === 'synthetic-session-alpha') return `warm body synthetic-marker-alpha`;
        if (session === 'synthetic-session-beta') {
          return sessionBSeesMarkerA ? `cached body synthetic-marker-alpha` : `own body synthetic-marker-beta`;
        }
        return 'anonymous';
      },
      headers: () => ({ 'x-cache': sessionBSeesMarkerA ? 'HIT' : 'MISS', 'cache-control': 'public, max-age=60' }),
    }),
    close: async () => {},
  });
  const contextFor = (options?: Record<string, unknown>) => {
    const headers = ((options?.extraHTTPHeaders || {}) as Record<string, string>);
    return { newPage: async () => pageFor(headers), close: async () => {} };
  };
  return {
    chromium: {
      launch: async () => ({
        newContext: async (options?: Record<string, unknown>) => contextFor(options),
        close: async () => {},
      }),
    },
  };
}

describe('Cache Isolation live probe (selected-project workflow)', () => {
  it('confirms a leak when Session B receives Session A marker, keeping values out of output', async () => {
    const result = await runCacheIsolationProbe(baseConfig, {
      env,
      playwright: fakePlaywright(true),
    });
    expect(result.probes).toHaveLength(2);
    expect(result.probes[0]!.status).toBe('leak');
    expect(result.probes[0]!.markerFingerprint).toHaveLength(12);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('synthetic-session-alpha');
    expect(serialized).not.toContain('synthetic-session-beta');
    expect(serialized).not.toContain('synthetic-marker-alpha');
    expect(serialized).not.toContain('synthetic-marker-beta');
    expect(result.reproductionTest).toContain('STACKFOLD_SESSION_A');
    expect(result.reproductionTest).not.toContain('synthetic-marker-alpha');
  });

  it('reports isolated when Session B only sees its own marker', async () => {
    const result = await runCacheIsolationProbe(baseConfig, {
      env,
      playwright: fakePlaywright(false),
    });
    expect(result.probes.every(probe => probe.status === 'isolated')).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('synthetic-marker-alpha');
  });

  it('requires distinct credentials and distinct markers', async () => {
    await expect(runCacheIsolationProbe(baseConfig, {
      env: { ...env, STACKFOLD_SESSION_B: env.STACKFOLD_SESSION_A },
      playwright: fakePlaywright(false),
    })).rejects.toThrow('distinct credentials');
    await expect(runCacheIsolationProbe(baseConfig, {
      env: { ...env, STACKFOLD_MARKER_B: env.STACKFOLD_MARKER_A },
      playwright: fakePlaywright(false),
    })).rejects.toThrow('distinct private markers');
  });

  it('names the missing environment reference without exposing values', async () => {
    const { STACKFOLD_MARKER_B: _dropped, ...partial } = env;
    await expect(runCacheIsolationProbe(baseConfig, {
      env: partial,
      playwright: fakePlaywright(false),
    })).rejects.toThrow('STACKFOLD_MARKER_B');
  });

  it('parses the selected-project configuration from environment references', () => {
    const config = parseCacheIsolationConfig(JSON.stringify({
      schemaVersion: 1,
      baseUrl: 'http://127.0.0.1:4178',
      environment: 'selected-project',
      authentication: {
        kind: 'header',
        headerName: 'x-stackfold-test-session',
        sessionAEnv: 'STACKFOLD_SESSION_A',
        sessionBEnv: 'STACKFOLD_SESSION_B',
      },
      markers: { sessionAMarkerEnv: 'STACKFOLD_MARKER_A', sessionBMarkerEnv: 'STACKFOLD_MARKER_B' },
      probes: [{ id: 'p1', label: 'P1', kind: 'html', path: '/dashboard' }],
    }));
    expect(config.authentication.sessionAEnv).toBe('STACKFOLD_SESSION_A');
  });
});
