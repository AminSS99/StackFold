import path from 'node:path';
import ts from 'typescript';
import { z } from 'zod';
import type { Evidence, GraphNode, SourceRange } from '@stackfold/graph';
import { calculateChangeImpact } from '@stackfold/graph';
import type { DetectorInterface, ScanContext } from '../types';
import { readSafeFile } from '../utils/file-system';

const changeSchema = z.object({
  id: z.string().min(1),
  source: z.object({
    kind: z.enum(['manual', 'changelog']),
    name: z.string().min(1),
    version: z.string().min(1).optional(),
    uri: z.string().min(1).optional(),
  }),
  summary: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).default('medium'),
  targets: z.array(z.object({
    kind: z.literal('package'),
    packageName: z.string().min(1),
    changedSymbols: z.array(z.string().min(1)).default([]),
  })).min(1),
  migrationSteps: z.array(z.string().min(1)).min(1),
});

export const driftImpactConfigSchema = z.object({
  schemaVersion: z.literal(1),
  changes: z.array(changeSchema).min(1),
});

export type DriftImpactConfig = z.infer<typeof driftImpactConfigSchema>;

interface ImportMatch {
  node: GraphNode;
  packageName: string;
  importedSymbols: string[];
  changedSymbols: string[];
  sourceRange: SourceRange;
  snippet: string;
  confirmed: boolean;
}

function findJsonValueRange(content: string, value: string): SourceRange | undefined {
  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(`"${value}"`));
  if (index < 0) return undefined;
  const startColumn = Math.max(0, lines[index]!.indexOf(`"${value}"`));
  return {
    startLine: index + 1,
    startColumn,
    endLine: index + 1,
    endColumn: startColumn + value.length + 2,
  };
}

function importMatchesPackage(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function findImports(
  context: ScanContext,
  packageName: string,
  changedSymbols: string[]
): ImportMatch[] {
  const matches: ImportMatch[] = [];
  for (const relPath of context.tsJsFiles) {
    const content = readSafeFile(path.join(context.rootPath, relPath));
    if (!content) continue;
    const sourceFile = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true);

    sourceFile.forEachChild(node => {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
      if (!importMatchesPackage(node.moduleSpecifier.text, packageName)) return;

      const importedSymbols: string[] = [];
      if (node.importClause?.name) importedSymbols.push(node.importClause.name.text);
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) importedSymbols.push(bindings.name.text);
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) importedSymbols.push(element.propertyName?.text || element.name.text);
      }

      const starts = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const ends = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      const graphNode =
        context.builder.getNode(`source_module:${relPath}`) ||
        context.builder.getNode(`component:${relPath}`) ||
        context.builder.getNodes().find(candidate => candidate.filePath === relPath);
      if (!graphNode) return;

      const changedRoots = changedSymbols.map(symbol => symbol.split('.')[0]!);
      const confirmed =
        changedSymbols.length === 0 ||
        changedRoots.some(symbol => importedSymbols.includes(symbol));
      matches.push({
        node: graphNode,
        packageName,
        importedSymbols,
        changedSymbols,
        sourceRange: {
          startLine: starts.line + 1,
          startColumn: starts.character,
          endLine: ends.line + 1,
          endColumn: ends.character,
        },
        snippet: node.getText(sourceFile),
        confirmed,
      });
    });
  }
  return matches;
}

export function parseDriftImpactConfig(content: string): DriftImpactConfig {
  return driftImpactConfigSchema.parse(JSON.parse(content));
}

export const driftImpactDetector: DetectorInterface = {
  id: 'drift-impact',
  name: 'Drift Impact: upstream package and symbol changes',

  run(context: ScanContext) {
    for (const configPath of context.driftImpactConfigFiles) {
      const content = readSafeFile(path.join(context.rootPath, configPath));
      if (!content) continue;

      let config: DriftImpactConfig;
      try {
        config = parseDriftImpactConfig(content);
      } catch (error) {
        context.diagnostics.push({
          level: 'warning',
          code: 'DRIFT_IMPACT_INVALID_CONFIG',
          message: `Drift Impact skipped invalid configuration at '${configPath}'.`,
          filePath: configPath,
          details: { reason: error instanceof Error ? error.message : String(error) },
        });
        continue;
      }

      for (const change of config.changes) {
        const changeRange = findJsonValueRange(content, change.id);
        const changeEvidence: Evidence = {
          detectorId: driftImpactDetector.id,
          rule: 'upstream-change-description',
          filePath: configPath,
          sourceRange: changeRange,
          codeSnippet: `${change.source.name}${change.source.version ? ` ${change.source.version}` : ''}: ${change.summary}`,
          notes: `Supplied as a ${change.source.kind} change description; Stackfold does not modify code automatically.`,
        };
        const changeNode = context.builder.createAndAddNode({
          type: 'change_event',
          key: change.id,
          displayName: change.summary,
          filePath: configPath,
          sourceRange: changeRange,
          metadata: {
            changeId: change.id,
            sourceKind: change.source.kind,
            sourceName: change.source.name,
            sourceVersion: change.source.version,
            migrationSteps: change.migrationSteps,
          },
          evidence: changeEvidence,
          tags: ['drift-impact', 'upstream-change', change.source.kind],
        });

        const importMatches = change.targets.flatMap(target =>
          findImports(context, target.packageName, target.changedSymbols)
        );
        const confirmedMatches = importMatches.filter(match => match.confirmed);
        const selectedMatches = confirmedMatches.length > 0 ? confirmedMatches : importMatches;
        const status = confirmedMatches.length > 0 ? 'confirmed' : 'uncertain';
        const affectedNodes = new Map<string, GraphNode>();
        const evidence: Evidence[] = [changeEvidence];

        for (const match of selectedMatches) {
          affectedNodes.set(match.node.id, match.node);
          const importEvidence: Evidence = {
            detectorId: driftImpactDetector.id,
            rule: match.confirmed ? 'changed-symbol-import' : 'package-import-with-unresolved-symbol',
            filePath: match.node.filePath,
            sourceRange: match.sourceRange,
            codeSnippet: match.snippet,
            notes: match.confirmed
              ? `Imports changed symbol(s): ${match.changedSymbols.length ? match.changedSymbols.join(', ') : '(package-level change)'}.`
              : `Imports '${match.packageName}', but the supplied changed symbols were not directly imported.`,
          };
          evidence.push(importEvidence);
          context.builder.createAndAddEdge({
            source: changeNode.id,
            target: match.node.id,
            type: 'may_impact',
            metadata: {
              packageName: match.packageName,
              importedSymbols: match.importedSymbols,
              changedSymbols: match.changedSymbols,
              status: match.confirmed ? 'confirmed' : 'uncertain',
            },
            evidence: importEvidence,
            confidence: match.confirmed ? 'HIGH' : 'LOW',
          });

          const impact = calculateChangeImpact({
            nodes: context.builder.getNodes(),
            edges: context.builder.getEdges(),
          }, match.node.id);
          for (const impacted of [...impact.directDependents, ...impact.transitiveDependents]) {
            const node = context.builder.getNode(impacted.id);
            if (node && node.type !== 'change_event') affectedNodes.set(node.id, node);
          }
        }

        if (affectedNodes.size === 0) {
          const packageNames = new Set(change.targets.map(target => target.packageName));
          for (const node of context.builder.getNodes()) {
            const sdkPackages = Array.isArray(node.metadata.sdkPackages) ? node.metadata.sdkPackages : [];
            if (sdkPackages.some(pkg => packageNames.has(String(pkg)))) affectedNodes.set(node.id, node);
          }
        }
        if (affectedNodes.size === 0) continue;

        const affected = Array.from(affectedNodes.values());
        const affectedFiles = affected.flatMap(node => node.filePath ? [node.filePath] : []);
        context.builder.addFinding({
          id: `finding:drift-impact/upstream-package-change:${change.id}`,
          ruleId: 'drift-impact/upstream-package-change',
          severity: status === 'confirmed' ? change.severity : 'medium',
          status,
          title: `Drift Impact: ${change.summary}`,
          affectedNodeIds: affected.map(node => node.id),
          sourceLocation: { filePath: configPath, sourceRange: changeRange },
          evidence,
          explanation: status === 'confirmed'
            ? `The supplied upstream change matches imports in ${confirmedMatches.length} repository file${confirmedMatches.length === 1 ? '' : 's'}. Stackfold traced their graph dependents to ${affected.length} affected node${affected.length === 1 ? '' : 's'}.`
            : `The dependency is present, but Stackfold could not prove that the supplied changed symbols are imported directly. Treat the mapped nodes as review candidates.`,
          suggestedAction: change.migrationSteps.join(' '),
          metadata: {
            analyzer: 'Drift Impact',
            changeId: change.id,
            affectedFiles,
            importEvidence: selectedMatches.map(match => ({
              filePath: match.node.filePath,
              importedSymbols: match.importedSymbols,
              changedSymbols: match.changedSymbols,
            })),
            migrationSteps: change.migrationSteps,
            sourceUri: change.source.uri,
          },
        });
      }
    }
  },
};
