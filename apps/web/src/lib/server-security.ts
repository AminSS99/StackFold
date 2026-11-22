import path from 'node:path';
import { NextResponse } from 'next/server';
import { validateRepositoryPath } from '@stackfold/scanner';

export const PUBLIC_FIXTURES: Record<
  string,
  { name: string; description: string; frameworks: string[] }
> = {
  'sample-ecommerce-app': {
    name: 'Sample E-Commerce Store',
    description: 'Next.js 14 App Router + Prisma + PostgreSQL + Stripe + Resend + Tailwind',
    frameworks: ['Next.js', 'Prisma', 'Stripe', 'Resend', 'Tailwind CSS'],
  },
  'sample-monorepo-platform': {
    name: 'Multi-Package Monorepo Platform',
    description: 'pnpm Workspaces monorepo with 2 Next.js apps, shared Prisma DB, and utilities',
    frameworks: ['Next.js', 'Prisma', 'pnpm workspaces', 'Stripe'],
  },
  'preview-fence-vercel-supabase': {
    name: 'PreviewFence Environment Risk',
    description: 'Vercel preview environment sharing a production Supabase project',
    frameworks: ['Vercel', 'Supabase', 'PreviewFence'],
  },
  'tx-escape-prisma': {
    name: 'TxEscape Transaction Risk',
    description: 'Prisma transaction calling an imported Resend email helper',
    frameworks: ['Prisma', 'Resend', 'TxEscape'],
  },
  'scopepatch-idtrace': {
    name: 'ScopePatch and IDTrace Guardrails',
    description: 'GitHub App REST permission correlation and explicit typed identity boundaries',
    frameworks: ['GitHub App', 'Octokit', 'ScopePatch', 'IDTrace'],
  },
  'cache-isolation-vulnerable': {
    name: 'Cache Isolation Security Lab',
    description: 'Two authenticated Playwright sessions exposing a shared HTML cache leak',
    frameworks: ['Playwright', 'Cache Isolation', 'Security Lab'],
  },
  'signature-compatibility-vulnerable': {
    name: 'Signature Compatibility Mismatch',
    description: 'Signer and verifier disagree on eight normalization dimensions with byte-exact evidence',
    frameworks: ['HMAC-SHA256', 'Signature Compatibility', 'Security Lab'],
  },
  'signature-compatibility-passing': {
    name: 'Signature Compatibility Passing',
    description: 'Signer and verifier share one canonicalization across all eight test vectors',
    frameworks: ['HMAC-SHA256', 'Signature Compatibility', 'Security Lab'],
  },
  'queue-compatibility-failing': {
    name: 'Queue Compatibility Historical Mismatch',
    description: 'Historical BullMQ v1 payloads replayed against a v2 worker contract with field-exact evidence',
    frameworks: ['BullMQ', 'Queue Compatibility', 'Security Lab'],
  },
  'queue-compatibility-passing': {
    name: 'Queue Compatibility Passing',
    description: 'Historical BullMQ payloads that all satisfy the current worker contract',
    frameworks: ['BullMQ', 'Queue Compatibility', 'Security Lab'],
  },
};

export function getRepoRoot(): string {
  return path.resolve(process.cwd(), '../../');
}

export function isHostedEnvironment(req?: Request): boolean {
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_STACKFOLD_DEMO === 'true') {
    return true;
  }
  if (!req) return false;
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(':')[0]
    ?.toLowerCase()
    .trim();
  if (!host) return false;
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
}

// Per-IP sliding-window rate limiter to protect public endpoints from abuse/DoS.
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  req: Request,
  bucket: string,
  limit = 30,
  windowMs = 60_000
): NextResponse | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : req.headers.get('x-real-ip') || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  if (rateBuckets.size > 2000) {
    for (const [k, timestamps] of rateBuckets) {
      if ((timestamps[timestamps.length - 1] ?? 0) < cutoff) {
        rateBuckets.delete(k);
      }
    }
  }

  const recent = (rateBuckets.get(key) || []).filter(ts => ts > cutoff);
  if (recent.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil(((recent[0] ?? now) + windowMs - now) / 1000));
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before retrying.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  recent.push(now);
  rateBuckets.set(key, recent);
  return null;
}

export function extractFixtureIdFromPath(rawPath?: string): string | undefined {
  if (!rawPath) return undefined;
  const trimmed = rawPath.trim();
  if (trimmed in PUBLIC_FIXTURES) return trimmed;

  const prefixPatterns = [
    /^\[Fixture\]\s*([a-z0-9-]+)$/i,
    /^\/?fixtures\/([a-z0-9-]+)\/?$/i,
    /^\/?demo\/([a-z0-9-]+)\/?$/i,
    /\/fixtures\/([a-z0-9-]+)\/?$/i,
  ];
  for (const pattern of prefixPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1] && match[1] in PUBLIC_FIXTURES) {
      return match[1];
    }
  }
  return undefined;
}

export interface SafeTargetResolution {
  physicalRoot: string;
  displayPath: string;
  source: string;
  isFixture: boolean;
  fixtureId?: string;
}

export function resolveSafeTarget(options: {
  req?: Request;
  fixture?: string;
  rootPath?: string;
  defaultFixture?: string;
  allowedFixtures?: Set<string>;
}): SafeTargetResolution {
  const hosted = isHostedEnvironment(options.req);
  const repoRoot = getRepoRoot();

  const candidateFixture =
    options.fixture || extractFixtureIdFromPath(options.rootPath) || (!options.rootPath ? options.defaultFixture : undefined);

  if (candidateFixture) {
    if (candidateFixture === 'stackfold-self') {
      if (hosted) {
        throw new Error('Self-scan of the server host container is disabled on public web deployments.');
      }
      return {
        physicalRoot: repoRoot,
        displayPath: 'stackfold-self',
        source: 'fixture:stackfold-self',
        isFixture: true,
        fixtureId: 'stackfold-self',
      };
    }

    const effectiveFixture =
      options.allowedFixtures && !options.allowedFixtures.has(candidateFixture) && options.defaultFixture
        ? options.defaultFixture
        : candidateFixture;

    if (!(effectiveFixture in PUBLIC_FIXTURES)) {
      throw new Error(`Unknown bundled fixture: '${effectiveFixture}'.`);
    }

    return {
      physicalRoot: path.join(repoRoot, 'fixtures', effectiveFixture),
      displayPath: `fixtures/${effectiveFixture}`,
      source: `fixture:${effectiveFixture}`,
      isFixture: true,
      fixtureId: effectiveFixture,
    };
  }

  if (options.rootPath) {
    if (hosted) {
      throw new Error(
        'Arbitrary server filesystem paths are disabled on the public hosted web app. Select a bundled fixture, or run Stackfold locally / on desktop to scan your own repository.'
      );
    }

    const validation = validateRepositoryPath(options.rootPath);
    if (!validation.isValid || !validation.canonicalPath) {
      throw new Error(validation.errorMessage || 'Invalid repository path.');
    }

    return {
      physicalRoot: validation.canonicalPath,
      displayPath: validation.canonicalPath,
      source: 'selected-project',
      isFixture: false,
    };
  }

  if (options.defaultFixture && options.defaultFixture in PUBLIC_FIXTURES) {
    return {
      physicalRoot: path.join(repoRoot, 'fixtures', options.defaultFixture),
      displayPath: `fixtures/${options.defaultFixture}`,
      source: `fixture:${options.defaultFixture}`,
      isFixture: true,
      fixtureId: options.defaultFixture,
    };
  }

  throw new Error('A bundled fixture identifier is required.');
}

/**
 * Replaces physical server paths (e.g. `/var/task/fixtures/...` or `/Users/...`)
 * with clean relative display paths so internal host layout never leaks to clients.
 */
export function sanitizeServerPaths<T>(value: T, physicalRoot: string, displayPath: string): T {
  const repoRoot = getRepoRoot();
  const raw = JSON.stringify(value);
  const sanitized = raw
    .split(physicalRoot)
    .join(displayPath)
    .split(repoRoot)
    .join('.');
  return JSON.parse(sanitized) as T;
}

export function sanitizeConfigPath(configPath: string, physicalRoot: string): string {
  if (!configPath) return '';
  const rel = path.relative(physicalRoot, configPath).replace(/\\/g, '/');
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    return rel;
  }
  return path.basename(configPath);
}

/**
 * Prevents SSRF by ensuring live probe targets only connect to local loopback addresses.
 */
export function isLoopbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}
