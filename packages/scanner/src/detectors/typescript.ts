import path from 'node:path';
import ts from 'typescript';
import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';

interface ImportInfo {
  moduleSpecifier: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export function extractImportsAndExports(sourceFile: ts.SourceFile): {
  imports: ImportInfo[];
  exports: string[];
  functions: string[];
} {
  const imports: ImportInfo[] = [];
  const exports: string[] = [];
  const functions: string[] = [];

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const importedSymbols: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      if (node.importClause) {
        if (node.importClause.name) {
          isDefault = true;
          importedSymbols.push(node.importClause.name.text);
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            isNamespace = true;
            importedSymbols.push(node.importClause.namedBindings.name.text);
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const elem of node.importClause.namedBindings.elements) {
              importedSymbols.push(elem.name.text);
            }
          }
        }
      }

      imports.push({
        moduleSpecifier,
        importedSymbols,
        isDefault,
        isNamespace,
      });
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      functions.push(node.name.text);
      if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.push(node.name.text);
      }
    } else if (ts.isVariableStatement(node)) {
      if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        }
      }
    }
  });

  return { imports, exports, functions };
}

export function resolveImportTarget(
  sourceRelPath: string,
  importSpecifier: string,
  allFiles: string[]
): string | null {
  if (importSpecifier.startsWith('.')) {
    const sourceDir = path.dirname(sourceRelPath);
    const resolvedBase = path.normalize(path.join(sourceDir, importSpecifier)).replace(/\\/g, '/');

    const candidates = [
      resolvedBase,
      `${resolvedBase}.ts`,
      `${resolvedBase}.tsx`,
      `${resolvedBase}.js`,
      `${resolvedBase}.jsx`,
      `${resolvedBase}/index.ts`,
      `${resolvedBase}/index.tsx`,
      `${resolvedBase}/index.js`,
    ];

    for (const cand of candidates) {
      if (allFiles.includes(cand)) {
        return cand;
      }
    }
  } else if (importSpecifier.startsWith('@/')) {
    const subPath = importSpecifier.slice(2);
    const candidates = [
      subPath,
      `src/${subPath}`,
      `${subPath}.ts`,
      `${subPath}.tsx`,
      `${subPath}.js`,
      `src/${subPath}.ts`,
      `src/${subPath}.tsx`,
      `src/${subPath}.js`,
      `${subPath}/index.ts`,
      `${subPath}/index.tsx`,
      `src/${subPath}/index.ts`,
      `src/${subPath}/index.tsx`,
    ];

    for (const cand of candidates) {
      if (allFiles.includes(cand)) return cand;
      const matching = allFiles.find(f => f.endsWith('/' + cand) || f === cand);
      if (matching) return matching;
    }
  }

  return null;
}

export const typescriptDetector: DetectorInterface = {
  id: 'typescript-detector',
  name: 'TypeScript and JavaScript AST Module Detector',

  async run(context: ScanContext) {
    const { rootPath, builder, tsJsFiles } = context;

    for (const relPath of tsJsFiles) {
      const fullPath = path.join(rootPath, relPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      let sourceFile: ts.SourceFile;
      try {
        sourceFile = ts.createSourceFile(
          relPath,
          content,
          ts.ScriptTarget.Latest,
          true,
          relPath.endsWith('.tsx') || relPath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );
      } catch {
        context.diagnostics.push({
          level: 'warning',
          code: 'AST_PARSE_FAILURE',
          message: `Failed to parse AST for ${relPath}`,
          filePath: relPath,
        });
        continue;
      }

      const { imports, exports, functions } = extractImportsAndExports(sourceFile);

      const existingNode = builder.getNode(`source_module:${relPath}`) ||
        builder.getNode(`component:${relPath}`) ||
        builder.getNodes().find(n => n.filePath === relPath);

      let sourceNode = existingNode;
      if (!sourceNode) {
        sourceNode = builder.createAndAddNode({
          type: 'source_module',
          key: relPath,
          displayName: path.basename(relPath),
          filePath: relPath,
          metadata: {
            exports,
            functions,
            importsCount: imports.length,
          },
          evidence: {
            detectorId: typescriptDetector.id,
            rule: 'source-module',
            filePath: relPath,
          },
          tags: ['module', path.extname(relPath).slice(1)],
        });
      }

      for (const imp of imports) {
        const resolvedPath = resolveImportTarget(relPath, imp.moduleSpecifier, tsJsFiles);
        if (resolvedPath) {
          const targetNode = builder.getNode(`source_module:${resolvedPath}`) ||
            builder.getNode(`component:${resolvedPath}`) ||
            builder.getNodes().find(n => n.filePath === resolvedPath);

          if (targetNode && sourceNode) {
            builder.createAndAddEdge({
              source: sourceNode.id,
              target: targetNode.id,
              type: 'imports',
              metadata: {
                importedSymbols: imp.importedSymbols,
                specifier: imp.moduleSpecifier,
              },
              evidence: {
                detectorId: typescriptDetector.id,
                rule: 'module-import',
                filePath: relPath,
                codeSnippet: `import { ${imp.importedSymbols.join(', ')} } from '${imp.moduleSpecifier}'`,
              },
            });
          }
        }
      }
    }
  },
};
