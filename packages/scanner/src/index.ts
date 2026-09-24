import path from 'node:path';
import { GraphBuilder } from '@stackfold/graph';
import type { ScanOptions, ScanResult, ScanContext } from './types';
import { discoverFiles } from './utils/file-system';
import { workspaceDetector } from './detectors/workspace';
import { prismaDetector } from './detectors/prisma';
import { nextjsDetector } from './detectors/nextjs';
import { typescriptDetector } from './detectors/typescript';
import { envDetector } from './detectors/env';
import { externalServicesDetector } from './detectors/external-services';
import { previewFenceDetector } from './detectors/preview-fence';
import { driftImpactDetector } from './detectors/drift-impact';
import { runGuardrailRules } from './guardrails/runner';
import { cacheIsolationDetector } from './security/cache-isolation-detector';
import { signatureCompatibilityDetector } from './security/signature-compatibility-detector';
import { runPostScanCrossLinking } from './pipeline/validator';
import { validateRepositoryPath } from './security/path-validator';
import { ScanCacheManager } from './cache/manager';

export * from './types';
export * from './pipeline/stages';
export * from './security/path-validator';
export * from './cache/types';
export * from './cache/manager';
export { workspaceDetector } from './detectors/workspace';
export { prismaDetector, parsePrismaSchema } from './detectors/prisma';
export { nextjsDetector, normalizeRoutePath } from './detectors/nextjs';
export { typescriptDetector } from './detectors/typescript';
export { envDetector, parseEnvExample } from './detectors/env';
export { externalServicesDetector } from './detectors/external-services';
export { previewFenceDetector, parsePreviewFenceConfig } from './detectors/preview-fence';
export { driftImpactDetector, parseDriftImpactConfig } from './detectors/drift-impact';
export * from './reporting/findings';
export * from './guardrails/types';
export { runGuardrailRules, builtInGuardrailRules } from './guardrails/runner';
export { txEscapeRule } from './guardrails/rules/tx-escape';
export { scopePatchRule, parseScopePatchConfig } from './guardrails/rules/scope-patch';
export { idTraceRule, parseIdTraceConfig } from './guardrails/rules/id-trace';
export * from './security/cache-isolation';
export { cacheIsolationDetector } from './security/cache-isolation-detector';
export * from './security/signature-compatibility';
export { signatureCompatibilityDetector } from './security/signature-compatibility-detector';

export async function scanRepository(options: ScanOptions): Promise<ScanResult> {
  const startTime = Date.now();
  const onProgress = options.onProgress;
  const signal = options.signal;

  // 1. Validate repository path
  onProgress?.({ stage: 'VALIDATING_PATH', message: 'Validating path and permissions...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');

  const validation = validateRepositoryPath(options.rootPath);
  if (!validation.isValid || !validation.canonicalPath) {
    throw new Error(validation.errorMessage || `Invalid repository path: ${options.rootPath}`);
  }

  const rootPath = validation.canonicalPath;
  const projectName = options.projectName || validation.projectName || path.basename(rootPath);
  const cacheManager = new ScanCacheManager();

  // 2. Check cache if enabled
  if (options.useCache) {
    const cached = await cacheManager.loadArtifact(rootPath);
    if (cached) {
      onProgress?.({ stage: 'COMPLETED', message: 'Loaded from verified local cache' });
      return {
        graph: cached.graph,
        durationMs: cached.durationMs,
        scannedFilesCount: cached.scannedFilesCount,
        diagnostics: cached.diagnostics,
        fromCache: true,
      };
    }
  }

  const builder = new GraphBuilder();

  // 3. Discover files
  onProgress?.({ stage: 'DISCOVERING_FILES', message: 'Discovering project files & ignore rules...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');

  const fileList = await discoverFiles(rootPath, options.ignorePatterns);

  const maxFiles = options.maxFiles || 15000;
  if (fileList.length > maxFiles) {
    builder.addDiagnostic({
      level: 'warning',
      code: 'MAX_FILES_EXCEEDED',
      message: `Repository contains ${fileList.length} files. Scanning was limited to first ${maxFiles} files for performance.`,
    });
  }

  const boundedFileList = fileList.slice(0, maxFiles);

  const packageJsonFiles = boundedFileList.filter(f => path.basename(f) === 'package.json');
  const tsJsFiles = boundedFileList.filter(f => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.endsWith('.d.ts'));
  const prismaFiles = boundedFileList.filter(f => f.endsWith('.prisma'));
  const envExampleFiles = boundedFileList.filter(f =>
    path.basename(f).startsWith('.env.example') ||
    path.basename(f).startsWith('.env.template') ||
    path.basename(f).startsWith('.env.sample')
  );
  const previewFenceConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.preview-fence.json' || f === '.stackfold/preview-fence.json'
  );
  const driftImpactConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.drift-impact.json' || f === '.stackfold/drift-impact.json'
  );
  const scopePatchConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.github-app.json' || f === '.stackfold/github-app.json'
  );
  const idTraceConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.id-trace.json' || f === '.stackfold/id-trace.json'
  );
  const cacheIsolationConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.cache-isolation.json' || f === '.stackfold/cache-isolation.json'
  );
  const cacheIsolationResultFiles = boundedFileList.filter(f =>
    f === 'stackfold.cache-isolation-results.json' || f === '.stackfold/cache-isolation-results.json'
  );
  const signatureCompatibilityConfigFiles = boundedFileList.filter(f =>
    f === 'stackfold.signature-compatibility.json' || f === '.stackfold/signature-compatibility.json'
  );
  const signatureCompatibilityResultFiles = boundedFileList.filter(f =>
    f === 'stackfold.signature-compatibility-results.json' || f === '.stackfold/signature-compatibility-results.json'
  );

  const context: ScanContext = {
    rootPath,
    projectName,
    builder,
    fileList: boundedFileList,
    packageJsonFiles,
    tsJsFiles,
    prismaFiles,
    envExampleFiles,
    previewFenceConfigFiles,
    driftImpactConfigFiles,
    scopePatchConfigFiles,
    idTraceConfigFiles,
    cacheIsolationConfigFiles,
    cacheIsolationResultFiles,
    signatureCompatibilityConfigFiles,
    signatureCompatibilityResultFiles,
    frameworks: new Set<string>(),
    diagnostics: [],
    signal,
  };

  // 4. Workspace Detector
  onProgress?.({ stage: 'ANALYZING_WORKSPACE', message: 'Analyzing workspace & package manifests...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await workspaceDetector.run(context);

  // 5. Prisma Detector
  onProgress?.({ stage: 'PARSING_PRISMA_SCHEMAS', message: 'Parsing database schemas & models...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await prismaDetector.run(context);

  // 6. Next.js Detector
  onProgress?.({ stage: 'ANALYZING_NEXTJS_ROUTES', message: 'Detecting Next.js API & UI routes...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await nextjsDetector.run(context);

  // 7. TypeScript AST Detector
  onProgress?.({ stage: 'PARSING_TYPESCRIPT_AST', message: 'Parsing TypeScript/JavaScript AST modules...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await typescriptDetector.run(context);

  // 8. Environment Variable Detector
  onProgress?.({ stage: 'DETECTING_ENV_VARS', message: 'Extracting env variable names (zero secrets)...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await envDetector.run(context);

  // 9. External Services Detector
  onProgress?.({ stage: 'DETECTING_EXTERNAL_SDKS', message: 'Detecting external SDK integrations...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await externalServicesDetector.run(context);

  // 10. PreviewFence environment safety analysis
  onProgress?.({ stage: 'ANALYZING_ENVIRONMENT_SAFETY', message: 'Checking Vercel environments against Supabase resource boundaries...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await previewFenceDetector.run(context);

  // 11. Drift Impact upstream change analysis
  onProgress?.({ stage: 'ANALYZING_DRIFT_IMPACT', message: 'Mapping supplied upstream changes to imports, symbols, and graph dependents...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await driftImpactDetector.run(context);

  // 12. Architecture guardrail rules
  onProgress?.({ stage: 'ANALYZING_GUARDRAILS', message: 'Checking transaction, permission, and identity boundaries...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await runGuardrailRules(context);

  // 13. Cache Isolation security-test results
  onProgress?.({ stage: 'ANALYZING_CACHE_ISOLATION', message: 'Mapping two-session cache-isolation probes and reproductions...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await cacheIsolationDetector.run(context);

  // 14. Signature Compatibility signer/verifier results
  onProgress?.({ stage: 'ANALYZING_SIGNATURE_COMPATIBILITY', message: 'Comparing signer and verifier canonical inputs...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  await signatureCompatibilityDetector.run(context);

  // 14. Post-Scan Cross-linking
  onProgress?.({ stage: 'CROSS_LINKING_RELATIONS', message: 'Cross-linking model & service relationships...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  runPostScanCrossLinking(context);

  // 15. Final Graph Construction
  onProgress?.({ stage: 'BUILDING_NORMALIZED_GRAPH', message: 'Validating graph integrity...' });
  for (const diag of context.diagnostics) {
    builder.addDiagnostic(diag);
  }

  const graph = builder.build({
    rootPath,
    projectName,
    packageManager: context.packageManager,
    frameworks: Array.from(context.frameworks),
  });

  const durationMs = Date.now() - startTime;

  // 16. Save artifact in cache
  await cacheManager.saveArtifact({
    rootPath,
    projectName,
    durationMs,
    scannedFilesCount: boundedFileList.length,
    graph,
    diagnostics: graph.diagnostics,
  });

  onProgress?.({ stage: 'COMPLETED', message: 'Scan finished successfully' });

  return {
    graph,
    durationMs,
    scannedFilesCount: boundedFileList.length,
    diagnostics: graph.diagnostics,
    fromCache: false,
  };
}
