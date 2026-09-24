import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  loadSignatureCompatibilityConfig,
  parseSignatureCompatibilityResult,
  runSignatureCompatibilityCheck,
} from '@stackfold/scanner';

// Static-export compatible (see cache-isolation route). Desktop uses Tauri
// commands via the platform adapter; web deployments use this route.
export const dynamic = 'force-static';

const requestSchema = z.object({
  rootPath: z.string().min(1).optional(),
  fixture: z.string().min(1).max(120).optional(),
});

const FIXTURE_IDS = new Set([
  'signature-compatibility-vulnerable',
  'signature-compatibility-passing',
  'cache-isolation-vulnerable',
  'sample-ecommerce-app',
  'sample-monorepo-platform',
  'preview-fence-vercel-supabase',
  'tx-escape-prisma',
  'scopepatch-idtrace',
  'stackfold-self',
]);

function resolveTargetRoot(rootPath?: string, fixture?: string): { root: string; source: string } {
  if (fixture) {
    if (!FIXTURE_IDS.has(fixture)) {
      throw new Error(`Unknown bundled fixture: '${fixture}'.`);
    }
    if (fixture === 'stackfold-self') {
      return { root: path.resolve(process.cwd(), '../../'), source: 'fixture:stackfold-self' };
    }
    return { root: path.resolve(process.cwd(), `../../fixtures/${fixture}`), source: `fixture:${fixture}` };
  }
  if (rootPath) {
    const canonical = path.resolve(rootPath);
    const workspaceRoot = path.resolve(process.cwd(), '../../');
    if (!canonical.startsWith(workspaceRoot) && !canonical.startsWith('/tmp/')) {
      throw new Error('rootPath is outside the allowed local workspace.');
    }
    return { root: canonical, source: 'selected-project' };
  }
  return { root: path.resolve(process.cwd(), '../../fixtures/signature-compatibility-vulnerable'), source: 'fixture:signature-compatibility-vulnerable' };
}

function resultCandidates(root: string): string[] {
  return [
    path.join(root, '.stackfold/signature-compatibility-results.json'),
    path.join(root, 'stackfold.signature-compatibility-results.json'),
  ];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = requestSchema.safeParse({
      rootPath: url.searchParams.get('rootPath') || undefined,
      fixture: url.searchParams.get('fixture') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid recorded-result request.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    let target: { root: string; source: string };
    try {
      target = resolveTargetRoot(parsed.data.rootPath, parsed.data.fixture);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }
    let configPath = '';
    try {
      ({ configPath } = loadSignatureCompatibilityConfig(target.root));
    } catch {
      return NextResponse.json(
        { success: false, error: `No Signature Compatibility configuration found for '${target.source}'. Add .stackfold/signature-compatibility.json.`, code: 'MISSING_CONFIGURATION', source: target.source },
        { status: 404 }
      );
    }
    for (const candidate of resultCandidates(target.root)) {
      try {
        const content = fs.readFileSync(candidate, 'utf8');
        const result = parseSignatureCompatibilityResult(content);
        return NextResponse.json({ success: true, result, source: `recorded:${target.source}`, configPath });
      } catch {
        continue;
      }
    }
    return NextResponse.json(
      { success: false, error: `No recorded Signature Compatibility result found for '${target.source}'. Run a live check first.`, code: 'MISSING_RECORDED_RESULT', source: target.source, configPath },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to read recorded result.', code: 'RECORDED_LOAD_FAILED' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid check request.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    let target: { root: string; source: string };
    try {
      target = resolveTargetRoot(parsed.data.rootPath, parsed.data.fixture);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid target.', code: 'INVALID_TARGET' },
        { status: 400 }
      );
    }

    let config: ReturnType<typeof loadSignatureCompatibilityConfig>['config'];
    let configPath = '';
    try {
      ({ config, configPath } = loadSignatureCompatibilityConfig(target.root));
    } catch {
      return NextResponse.json(
        { success: false, error: `No Signature Compatibility configuration found for '${target.source}'. Add .stackfold/signature-compatibility.json.`, code: 'MISSING_CONFIGURATION', source: target.source },
        { status: 404 }
      );
    }

    // Synthetic demo secret for the bundled fixtures only. Selected projects
    // must provide the configured secret reference in the server environment.
    // The value is used as an HMAC key and never rendered or persisted.
    const isBundledDemo = !parsed.data.rootPath && target.source.startsWith('fixture:signature-compatibility-');
    const env: Record<string, string | undefined> = { ...process.env };
    if (isBundledDemo && !env[config.secretEnv]) {
      env[config.secretEnv] = 'sig-synthetic-demo-secret';
    }
    if (!env[config.secretEnv]) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing environment reference: ${config.secretEnv}.`,
          code: 'MISSING_ENVIRONMENT',
          source: target.source,
          configPath,
          missingEnv: [config.secretEnv],
        },
        { status: 412 }
      );
    }

    try {
      const result = await runSignatureCompatibilityCheck(config, { env });
      return NextResponse.json({ success: true, result, source: `live:${target.source}`, configPath });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Signature Compatibility check failed.', code: 'CHECK_FAILED', source: target.source, configPath },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Signature Compatibility check failed.', code: 'CHECK_FAILED' },
      { status: 500 }
    );
  }
}
