import path from 'node:path';
import ts from 'typescript';
import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';

interface EnvUsage {
  varName: string;
  filePath: string;
  line: number;
  snippet: string;
}

export function parseEnvExample(content: string): Set<string> {
  const vars = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      if (key && /^[A-Z0-9_]+$/i.test(key)) {
        vars.add(key);
      }
    } else if (/^[A-Z0-9_]+$/i.test(trimmed)) {
      vars.add(trimmed);
    }
  }

  return vars;
}

export function findEnvUsagesInAst(sourceFile: ts.SourceFile, filePath: string): EnvUsage[] {
  const usages: EnvUsage[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === 'process' &&
      node.expression.name.text === 'env'
    ) {
      const varName = node.name.text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      usages.push({
        varName,
        filePath,
        line: line + 1,
        snippet: node.getText(sourceFile),
      });
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === 'process' &&
      node.expression.name.text === 'env' &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      const varName = node.argumentExpression.text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      usages.push({
        varName,
        filePath,
        line: line + 1,
        snippet: node.getText(sourceFile),
      });
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.MetaProperty &&
      node.expression.name.text === 'env'
    ) {
      const varName = node.name.text;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      usages.push({
        varName,
        filePath,
        line: line + 1,
        snippet: node.getText(sourceFile),
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usages;
}

export const envDetector: DetectorInterface = {
  id: 'env-detector',
  name: 'Environment Variable Reference Detector (Zero Secret Leakage)',

  async run(context: ScanContext) {
    const { rootPath, builder, tsJsFiles, envExampleFiles } = context;

    const declaredVars = new Set<string>();
    let exampleFilePath: string | undefined;

    for (const envExPath of envExampleFiles) {
      const fullPath = path.join(rootPath, envExPath);
      const content = readSafeFile(fullPath);
      if (content) {
        exampleFilePath = envExPath;
        const parsed = parseEnvExample(content);
        for (const v of parsed) declaredVars.add(v);
      }
    }

    const allUsages: EnvUsage[] = [];
    for (const relPath of tsJsFiles) {
      const fullPath = path.join(rootPath, relPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      const sourceFile = ts.createSourceFile(
        relPath,
        content,
        ts.ScriptTarget.Latest,
        true,
        relPath.endsWith('.tsx') || relPath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const usages = findEnvUsagesInAst(sourceFile, relPath);
      allUsages.push(...usages);
    }

    const allVarNames = new Set<string>([...declaredVars, ...allUsages.map(u => u.varName)]);

    for (const varName of allVarNames) {
      const usagesForVar = allUsages.filter(u => u.varName === varName);
      const isDeclared = declaredVars.has(varName);

      const envNode = builder.createAndAddNode({
        type: 'environment_variable',
        key: varName,
        displayName: varName,
        filePath: exampleFilePath,
        metadata: {
          varName,
          isDeclaredInExample: isDeclared,
          usageCount: usagesForVar.length,
          usageLocations: usagesForVar.map(u => ({ filePath: u.filePath, line: u.line })),
        },
        evidence: {
          detectorId: envDetector.id,
          rule: isDeclared ? 'env-example-declared' : 'env-ast-reference',
          filePath: usagesForVar[0]?.filePath || exampleFilePath,
          codeSnippet: usagesForVar[0]?.snippet || `${varName}=...`,
          notes: isDeclared
            ? 'Declared in environment template file'
            : 'Detected in code but missing from template',
        },
        tags: ['env', isDeclared ? 'declared' : 'missing-declaration'],
      });

      if (!isDeclared) {
        context.diagnostics.push({
          level: 'warning',
          code: 'UNDECLARED_ENV_VAR',
          message: `Environment variable '${varName}' is accessed in code but not documented in .env.example`,
          filePath: usagesForVar[0]?.filePath,
          details: { varName, locations: usagesForVar.map(u => `${u.filePath}:${u.line}`) },
        });
      }

      for (const usage of usagesForVar) {
        const sourceNode =
          builder.getNode(`source_module:${usage.filePath}`) ||
          builder.getNode(`component:${usage.filePath}`) ||
          builder.getNodes().find(n => n.filePath === usage.filePath);

        if (sourceNode) {
          builder.createAndAddEdge({
            source: sourceNode.id,
            target: envNode.id,
            type: 'configured_by',
            metadata: {
              line: usage.line,
            },
            evidence: {
              detectorId: envDetector.id,
              rule: 'reads-env-var',
              filePath: usage.filePath,
              sourceRange: {
                startLine: usage.line,
                startColumn: 1,
                endLine: usage.line,
                endColumn: 1,
              },
              codeSnippet: usage.snippet,
            },
          });
        }
      }
    }
  },
};
