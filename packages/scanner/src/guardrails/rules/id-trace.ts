import path from 'node:path';
import ts from 'typescript';
import { z } from 'zod';
import type { Evidence, GraphNode, SourceRange } from '@stackfold/graph';
import type { ScanContext } from '../../types';
import { resolveImportTarget } from '../../detectors/typescript';
import { readSafeFile } from '../../utils/file-system';
import type { GuardrailRuleAdapter } from '../types';

const RULE_ID = 'guardrails/id-trace/unsupported-identity-crossing';

const identityDomainSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(['provider_user', 'database_user', 'workspace', 'tenant', 'organization', 'other']),
  provider: z.string().min(1).optional(),
  typeNames: z.array(z.string().min(1)).min(1),
});

const allowedCrossingSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  via: z.array(z.string().min(1)).min(1),
});

export const idTraceConfigSchema = z.object({
  schemaVersion: z.literal(1),
  domains: z.array(identityDomainSchema).min(2),
  allowedCrossings: z.array(allowedCrossingSchema).default([]),
}).superRefine((config, ctx) => {
  const ids = new Set(config.domains.map(domain => domain.id));
  if (ids.size !== config.domains.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Identity domain IDs must be unique.' });
  }
  for (const crossing of config.allowedCrossings) {
    if (!ids.has(crossing.from) || !ids.has(crossing.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Allowed crossing '${crossing.from}' -> '${crossing.to}' references an unknown domain.`,
      });
    }
  }
});

export type IdTraceConfig = z.infer<typeof idTraceConfigSchema>;
type IdentityDomain = IdTraceConfig['domains'][number];

interface FunctionSignature {
  filePath: string;
  name: string;
  parameterDomains: Array<IdentityDomain | undefined>;
  returnDomain?: IdentityDomain;
}

function rangeOf(sourceFile: ts.SourceFile, node: ts.Node): SourceRange {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1,
    startColumn: start.character,
    endLine: end.line + 1,
    endColumn: end.character,
  };
}

function configRange(content: string, key: string): SourceRange | undefined {
  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(`\"${key}\"`));
  if (index < 0) return undefined;
  const column = Math.max(0, lines[index]!.indexOf(`\"${key}\"`));
  return {
    startLine: index + 1,
    startColumn: column,
    endLine: index + 1,
    endColumn: column + key.length + 2,
  };
}

function graphNodeForFile(context: ScanContext, filePath: string): GraphNode | undefined {
  return context.builder.getNode(`source_module:${filePath}`) ||
    context.builder.getNode(`component:${filePath}`) ||
    context.builder.getNodes().find(node => node.filePath === filePath);
}

function typeName(typeNode: ts.TypeNode | undefined): string | undefined {
  if (!typeNode) return undefined;
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    if (typeNode.typeName.text === 'Promise' && typeNode.typeArguments?.[0]) {
      return typeName(typeNode.typeArguments[0]);
    }
    return typeNode.typeName.text;
  }
  return undefined;
}

function domainForType(
  typeNode: ts.TypeNode | undefined,
  domainsByType: Map<string, IdentityDomain>
): IdentityDomain | undefined {
  const name = typeName(typeNode);
  return name ? domainsByType.get(name) : undefined;
}

function collectSignatures(
  filePath: string,
  sourceFile: ts.SourceFile,
  domainsByType: Map<string, IdentityDomain>
): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      signatures.push({
        filePath,
        name: statement.name.text,
        parameterDomains: statement.parameters.map(parameter => domainForType(parameter.type, domainsByType)),
        returnDomain: domainForType(statement.type, domainsByType),
      });
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      ) {
        signatures.push({
          filePath,
          name: declaration.name.text,
          parameterDomains: declaration.initializer.parameters.map(parameter => domainForType(parameter.type, domainsByType)),
          returnDomain: domainForType(declaration.initializer.type, domainsByType),
        });
      }
    }
  }
  return signatures;
}

function collectTypedBindings(
  sourceFile: ts.SourceFile,
  domainsByType: Map<string, IdentityDomain>
): Map<string, IdentityDomain> {
  const bindings = new Map<string, IdentityDomain>();
  const visit = (node: ts.Node) => {
    if ((ts.isParameter(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name)) {
      const domain = domainForType(node.type, domainsByType);
      if (domain) bindings.set(node.name.text, domain);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function callableSignatures(
  filePath: string,
  sourceFile: ts.SourceFile,
  allSignatures: FunctionSignature[],
  allFiles: string[]
): Map<string, FunctionSignature> {
  const callables = new Map<string, FunctionSignature>();
  for (const signature of allSignatures) {
    if (signature.filePath === filePath) callables.set(signature.name, signature);
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const targetPath = resolveImportTarget(filePath, statement.moduleSpecifier.text, allFiles);
    if (!targetPath) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text || element.name.text;
        const signature = allSignatures.find(item => item.filePath === targetPath && item.name === importedName);
        if (signature) callables.set(element.name.text, signature);
      }
    }
  }
  return callables;
}

function expressionDomain(
  expression: ts.Expression,
  bindings: Map<string, IdentityDomain>,
  callables: Map<string, FunctionSignature>
): IdentityDomain | undefined {
  if (ts.isIdentifier(expression)) return bindings.get(expression.text);
  if (ts.isParenthesizedExpression(expression)) return expressionDomain(expression.expression, bindings, callables);
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
    // Preserve the source domain so a cast cannot hide a crossing.
    return expressionDomain(expression.expression, bindings, callables);
  }
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    return callables.get(expression.expression.text)?.returnDomain;
  }
  return undefined;
}

function isAllowed(
  config: IdTraceConfig,
  from: IdentityDomain,
  to: IdentityDomain,
  via: string
): boolean {
  return config.allowedCrossings.some(crossing =>
    crossing.from === from.id && crossing.to === to.id && crossing.via.includes(via)
  );
}

function addUnsupportedCrossing(
  context: ScanContext,
  configPath: string,
  configContent: string,
  filePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  from: IdentityDomain,
  to: IdentityDomain,
  via: string
) {
  const sourceNode = graphNodeForFile(context, filePath);
  if (!sourceNode) return;
  const callRange = rangeOf(sourceFile, call);
  const callEvidence: Evidence = {
    detectorId: 'id-trace',
    rule: 'typed-identity-crossing',
    filePath,
    sourceRange: callRange,
    codeSnippet: call.getText(sourceFile),
    notes: `The call passes '${from.typeNames.join(' | ')}' into a '${to.typeNames.join(' | ')}' boundary.`,
  };
  const fromEvidence: Evidence = {
    detectorId: 'id-trace',
    rule: 'configured-identity-domain',
    filePath: configPath,
    sourceRange: configRange(configContent, from.id),
    codeSnippet: `${from.displayName}: ${from.typeNames.join(', ')}`,
    notes: 'Identity semantics come from explicit Stackfold configuration and TypeScript annotations, not variable names.',
  };
  const toEvidence: Evidence = {
    detectorId: 'id-trace',
    rule: 'configured-identity-domain',
    filePath: configPath,
    sourceRange: configRange(configContent, to.id),
    codeSnippet: `${to.displayName}: ${to.typeNames.join(', ')}`,
    notes: 'Identity semantics come from explicit Stackfold configuration and TypeScript annotations, not variable names.',
  };
  const fromNode = context.builder.getNode(`identity_domain:${from.id}`);
  const toNode = context.builder.getNode(`identity_domain:${to.id}`);
  if (!fromNode || !toNode) return;

  const suffix = `${filePath}:${callRange.startLine}:${from.id}:${to.id}`;
  const findingId = `finding:${RULE_ID}:${suffix}`;
  const boundaryNode = context.builder.createAndAddNode({
    type: 'risk_boundary',
    key: `${RULE_ID}:${suffix}`,
    displayName: `${from.displayName} crosses into ${to.displayName}`,
    filePath,
    sourceRange: callRange,
    metadata: {
      ruleId: RULE_ID,
      severity: 'high',
      status: 'confirmed',
      sourceDomain: from.id,
      targetDomain: to.id,
      via,
      evidenceBasis: 'explicit-config-and-types',
      findingId,
    },
    evidence: callEvidence,
    tags: ['guardrail', 'id-trace', 'risk', 'identity'],
  });
  context.builder.createAndAddEdge({
    source: fromNode.id,
    target: boundaryNode.id,
    type: 'crosses',
    metadata: { supported: false, via },
    evidence: callEvidence,
  });
  context.builder.createAndAddEdge({
    source: boundaryNode.id,
    target: toNode.id,
    type: 'crosses',
    metadata: { supported: false, via },
    evidence: callEvidence,
  });
  context.builder.createAndAddEdge({
    source: sourceNode.id,
    target: boundaryNode.id,
    type: 'violates',
    evidence: callEvidence,
  });
  context.builder.addFinding({
    id: findingId,
    ruleId: RULE_ID,
    severity: 'high',
    status: 'confirmed',
    title: `IDTrace: ${from.displayName} crosses into ${to.displayName} without a supported mapping`,
    affectedNodeIds: [sourceNode.id, fromNode.id, toNode.id, boundaryNode.id],
    sourceLocation: { filePath, sourceRange: callRange },
    evidence: [callEvidence, fromEvidence, toEvidence],
    explanation: `The call '${via}' crosses the explicitly configured '${from.displayName}' and '${to.displayName}' identity domains. Their TypeScript annotations are distinct, and no matching supported conversion is configured for this call path. Treating the identifiers as interchangeable can select or authorize the wrong principal.`,
    suggestedAction: `Resolve '${from.displayName}' to '${to.displayName}' through a reviewed mapping function, validate tenant/workspace ownership during the lookup, and list that converter in allowedCrossings only after the mapping is enforced.`,
    metadata: {
      analyzer: 'IDTrace',
      sourceDomain: from.id,
      targetDomain: to.id,
      via,
      evidenceBasis: 'explicit-config-and-types',
      inferredFromVariableNames: false,
    },
  });
}

export function parseIdTraceConfig(content: string): IdTraceConfig {
  return idTraceConfigSchema.parse(JSON.parse(content));
}

export const idTraceRule: GuardrailRuleAdapter = {
  id: RULE_ID,
  name: 'IDTrace: explicit identity-domain crossings',

  analyze(context: ScanContext) {
    for (const configPath of context.idTraceConfigFiles) {
      const configContent = readSafeFile(path.join(context.rootPath, configPath));
      if (!configContent) continue;
      let config: IdTraceConfig;
      try {
        config = parseIdTraceConfig(configContent);
      } catch (error) {
        context.diagnostics.push({
          level: 'warning',
          code: 'ID_TRACE_INVALID_CONFIG',
          message: `IDTrace skipped invalid configuration at '${configPath}'.`,
          filePath: configPath,
          details: { reason: error instanceof Error ? error.message : String(error) },
        });
        continue;
      }

      const domainsByType = new Map<string, IdentityDomain>();
      for (const domain of config.domains) {
        for (const name of domain.typeNames) domainsByType.set(name, domain);
        const evidence: Evidence = {
          detectorId: 'id-trace',
          rule: 'configured-identity-domain',
          filePath: configPath,
          sourceRange: configRange(configContent, domain.id),
          codeSnippet: `${domain.displayName}: ${domain.typeNames.join(', ')}`,
          notes: 'Loaded from explicit identity-domain configuration; secret or runtime identifier values are not read.',
        };
        context.builder.createAndAddNode({
          type: 'identity_domain',
          key: domain.id,
          displayName: domain.displayName,
          filePath: configPath,
          sourceRange: evidence.sourceRange,
          metadata: {
            domainId: domain.id,
            kind: domain.kind,
            provider: domain.provider,
            typeNames: domain.typeNames,
          },
          evidence,
          tags: ['id-trace', 'identity-domain', domain.kind],
        });
      }

      for (const crossing of config.allowedCrossings) {
        const fromNode = context.builder.getNode(`identity_domain:${crossing.from}`);
        const toNode = context.builder.getNode(`identity_domain:${crossing.to}`);
        if (!fromNode || !toNode) continue;
        context.builder.createAndAddEdge({
          source: fromNode.id,
          target: toNode.id,
          type: 'crosses',
          metadata: { supported: true, via: crossing.via },
          evidence: {
            detectorId: 'id-trace',
            rule: 'configured-supported-crossing',
            filePath: configPath,
            sourceRange: configRange(configContent, crossing.from),
            codeSnippet: `${crossing.from} -> ${crossing.to} via ${crossing.via.join(', ')}`,
          },
        });
      }

      const parsedFiles = new Map<string, ts.SourceFile>();
      const allSignatures: FunctionSignature[] = [];
      for (const filePath of context.tsJsFiles) {
        const content = readSafeFile(path.join(context.rootPath, filePath));
        if (!content) continue;
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        parsedFiles.set(filePath, sourceFile);
        allSignatures.push(...collectSignatures(filePath, sourceFile, domainsByType));
      }

      for (const [filePath, sourceFile] of parsedFiles) {
        const bindings = collectTypedBindings(sourceFile, domainsByType);
        const callables = callableSignatures(filePath, sourceFile, allSignatures, context.tsJsFiles);
        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
            const via = node.expression.text;
            const signature = callables.get(via);
            if (signature) {
              signature.parameterDomains.forEach((expected, index) => {
                const argument = node.arguments[index];
                if (!expected || !argument) return;
                const actual = expressionDomain(argument, bindings, callables);
                if (actual && actual.id !== expected.id) {
                  addUnsupportedCrossing(
                    context, configPath, configContent, filePath, sourceFile,
                    node, actual, expected, via
                  );
                }
              });

              const sourceDomain = signature.parameterDomains[0];
              const targetDomain = signature.returnDomain;
              if (
                sourceDomain && targetDomain && sourceDomain.id !== targetDomain.id &&
                !isAllowed(config, sourceDomain, targetDomain, via)
              ) {
                const actual = node.arguments[0]
                  ? expressionDomain(node.arguments[0], bindings, callables)
                  : undefined;
                if (actual?.id === sourceDomain.id) {
                  addUnsupportedCrossing(
                    context, configPath, configContent, filePath, sourceFile,
                    node, sourceDomain, targetDomain, via
                  );
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(sourceFile);
      }
    }
  },
};
