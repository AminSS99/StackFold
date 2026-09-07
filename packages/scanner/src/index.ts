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

  const context: ScanContext = {
    rootPath,
    projectName,
    builder,
    fileList: boundedFileList,
    packageJsonFiles,
    tsJsFiles,
    prismaFiles,
    envExampleFiles,
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

  // 10. Post-Scan Cross-linking
  onProgress?.({ stage: 'CROSS_LINKING_RELATIONS', message: 'Cross-linking model & service relationships...' });
  if (signal?.aborted) throw new Error('Scan aborted by user');
  runPostScanCrossLinking(context);

  // 11. Final Graph Construction
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

  // 12. Save artifact in cache
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
