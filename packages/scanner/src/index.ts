import fs from 'node:fs';
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

export * from './types';
export { workspaceDetector } from './detectors/workspace';
export { prismaDetector, parsePrismaSchema } from './detectors/prisma';
export { nextjsDetector, normalizeRoutePath } from './detectors/nextjs';
export { typescriptDetector } from './detectors/typescript';
export { envDetector, parseEnvExample } from './detectors/env';
export { externalServicesDetector } from './detectors/external-services';

export async function scanRepository(options: ScanOptions): Promise<ScanResult> {
  const startTime = Date.now();
  const rootPath = path.resolve(options.rootPath);

  if (!fs.existsSync(rootPath)) {
    throw new Error(`Repository root path does not exist: ${rootPath}`);
  }

  const projectName = options.projectName || path.basename(rootPath);
  const builder = new GraphBuilder();

  // 1. Discover files
  const fileList = await discoverFiles(rootPath, options.ignorePatterns);

  const packageJsonFiles = fileList.filter(f => path.basename(f) === 'package.json');
  const tsJsFiles = fileList.filter(f => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.endsWith('.d.ts'));
  const prismaFiles = fileList.filter(f => f.endsWith('.prisma'));
  const envExampleFiles = fileList.filter(f =>
    path.basename(f).startsWith('.env.example') ||
    path.basename(f).startsWith('.env.template') ||
    path.basename(f).startsWith('.env.sample')
  );

  const context: ScanContext = {
    rootPath,
    projectName,
    builder,
    fileList,
    packageJsonFiles,
    tsJsFiles,
    prismaFiles,
    envExampleFiles,
    frameworks: new Set<string>(),
    diagnostics: [],
  };

  // 2. Run detector pipeline
  await workspaceDetector.run(context);
  await prismaDetector.run(context);
  await nextjsDetector.run(context);
  await typescriptDetector.run(context);
  await envDetector.run(context);
  await externalServicesDetector.run(context);

  // 3. Post-scan cross linking
  runPostScanCrossLinking(context);

  // 4. Transfer diagnostics into builder
  for (const diag of context.diagnostics) {
    builder.addDiagnostic(diag);
  }

  // 5. Build validated graph
  const graph = builder.build({
    rootPath,
    projectName,
    packageManager: context.packageManager,
    frameworks: Array.from(context.frameworks),
  });

  const durationMs = Date.now() - startTime;

  return {
    graph,
    durationMs,
    scannedFilesCount: fileList.length,
    diagnostics: graph.diagnostics,
  };
}
