import path from 'node:path';
import type { ScanContext } from '../types';
import { readSafeFile } from '../utils/file-system';

export function runPostScanCrossLinking(context: ScanContext) {
  const { rootPath, builder, tsJsFiles } = context;
  const nodes = builder.getNodes();

  const dbModelNodes = nodes.filter(n => n.type === 'database_model');
  if (dbModelNodes.length === 0) return;

  const modelLookup = new Map<string, typeof dbModelNodes[0]>();
  for (const modelNode of dbModelNodes) {
    modelLookup.set(modelNode.displayName.toLowerCase(), modelNode);
  }

  for (const relPath of tsJsFiles) {
    const fullPath = path.join(rootPath, relPath);
    const content = readSafeFile(fullPath);
    if (!content) continue;

    if (content.includes('prisma.') || content.includes('db.')) {
      const matchingNodes = nodes.filter(n => n.filePath === relPath);

      for (const [modelNameLower, modelNode] of modelLookup.entries()) {
        const readRegex = new RegExp(`(?:prisma|db)\\.${modelNameLower}\\.(findMany|findUnique|findFirst|count|aggregate)`, 'i');
        const writeRegex = new RegExp(`(?:prisma|db)\\.${modelNameLower}\\.(create|createMany|update|updateMany|delete|deleteMany|upsert)`, 'i');

        const hasRead = readRegex.test(content);
        const hasWrite = writeRegex.test(content);

        for (const sourceNode of matchingNodes) {
          if (hasRead) {
            builder.createAndAddEdge({
              source: sourceNode.id,
              target: modelNode.id,
              type: 'reads',
              evidence: {
                detectorId: 'validator-cross-linker',
                rule: 'prisma-query-read',
                filePath: relPath,
                codeSnippet: `prisma.${modelNode.displayName}.find...`,
              },
            });
          }

          if (hasWrite) {
            builder.createAndAddEdge({
              source: sourceNode.id,
              target: modelNode.id,
              type: 'writes',
              evidence: {
                detectorId: 'validator-cross-linker',
                rule: 'prisma-query-write',
                filePath: relPath,
                codeSnippet: `prisma.${modelNode.displayName}.create/update/delete...`,
              },
            });
          }
        }
      }
    }
  }
}
