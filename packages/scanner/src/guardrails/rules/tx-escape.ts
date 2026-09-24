import path from 'node:path';
import ts from 'typescript';
import type { Evidence, GraphNode, SourceRange } from '@stackfold/graph';
import type { ScanContext } from '../../types';
import { resolveImportTarget } from '../../detectors/typescript';
import { readSafeFile } from '../../utils/file-system';
import type { GuardrailRuleAdapter } from '../types';

const RULE_ID = 'guardrails/tx-escape/external-side-effect-in-transaction';

type SideEffectKind = 'email' | 'external_request' | 'queued_job';

interface SideEffect {
  kind: SideEffectKind;
  filePath: string;
  sourceRange: SourceRange;
  snippet: string;
  provider?: string;
}

interface ImportedHelper {
  localName: string;
  importedName: string;
  targetPath: string;
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

function packageImports(sourceFile: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>();
  sourceFile.forEachChild(node => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const packageName = node.moduleSpecifier.text;
    if (packageName.startsWith('.')) return;
    if (node.importClause?.name) imports.set(node.importClause.name.text, packageName);
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) imports.set(bindings.name.text, packageName);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) imports.set(element.name.text, packageName);
    }
  });
  return imports;
}

function localHelpers(
  sourceFile: ts.SourceFile,
  filePath: string,
  allFiles: string[]
): Map<string, ImportedHelper> {
  const helpers = new Map<string, ImportedHelper>();
  sourceFile.forEachChild(node => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const targetPath = resolveImportTarget(filePath, node.moduleSpecifier.text, allFiles);
    if (!targetPath) return;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        helpers.set(element.name.text, {
          localName: element.name.text,
          importedName: element.propertyName?.text || element.name.text,
          targetPath,
        });
      }
    }
    if (node.importClause?.name) {
      helpers.set(node.importClause.name.text, {
        localName: node.importClause.name.text,
        importedName: 'default',
        targetPath,
      });
    }
  });
  return helpers;
}

function classifyCall(
  sourceFile: ts.SourceFile,
  filePath: string,
  call: ts.CallExpression,
  imports: Map<string, string>
): SideEffect | undefined {
  const expression = call.expression.getText(sourceFile);
  const root = expression.split('.')[0]!;
  const importedPackage = imports.get(root);

  let kind: SideEffectKind | undefined;
  let provider: string | undefined;
  if (expression === 'fetch') {
    kind = 'external_request';
    provider = 'Fetch API';
  } else if (importedPackage === 'axios' || importedPackage === 'got') {
    kind = 'external_request';
    provider = importedPackage;
  } else if (
    Array.from(imports.values()).some(pkg => pkg === 'resend' || pkg.includes('sendgrid')) &&
    /\.emails\.send$|\.sendEmail$/.test(expression)
  ) {
    kind = 'email';
    provider = Array.from(imports.values()).find(pkg => pkg === 'resend' || pkg.includes('sendgrid'));
  } else if (
    Array.from(imports.values()).some(pkg => pkg === 'bullmq') &&
    /\.add$|\.addBulk$/.test(expression)
  ) {
    kind = 'queued_job';
    provider = 'BullMQ';
  } else if (
    Array.from(imports.values()).some(pkg => pkg === '@aws-sdk/client-sqs') &&
    /\.send$/.test(expression)
  ) {
    kind = 'queued_job';
    provider = 'Amazon SQS';
  }

  if (!kind) return undefined;
  return {
    kind,
    filePath,
    sourceRange: rangeOf(sourceFile, call),
    snippet: call.getText(sourceFile),
    provider,
  };
}

function sideEffectsWithin(
  sourceFile: ts.SourceFile,
  filePath: string,
  rootNode: ts.Node
): SideEffect[] {
  const effects: SideEffect[] = [];
  const imports = packageImports(sourceFile);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const effect = classifyCall(sourceFile, filePath, node, imports);
      if (effect) effects.push(effect);
    }
    ts.forEachChild(node, visit);
  };
  visit(rootNode);
  return effects;
}

function findExportedHelperBody(
  sourceFile: ts.SourceFile,
  importedName: string
): ts.Node | undefined {
  for (const statement of sourceFile.statements) {
    if (
      importedName !== 'default' &&
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === importedName &&
      statement.body
    ) return statement.body;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === importedName &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
        ) return declaration.initializer.body;
      }
    }

    if (
      importedName === 'default' &&
      ts.isExportAssignment(statement) &&
      (ts.isArrowFunction(statement.expression) || ts.isFunctionExpression(statement.expression))
    ) return statement.expression.body;
  }
  return undefined;
}

function graphNodeForFile(context: ScanContext, filePath: string): GraphNode | undefined {
  return context.builder.getNode(`source_module:${filePath}`) ||
    context.builder.getNode(`component:${filePath}`) ||
    context.builder.getNodes().find(node => node.filePath === filePath);
}

function isTransactionCall(call: ts.CallExpression, sourceFile: ts.SourceFile): boolean {
  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  const name = call.expression.name.text;
  if (name === '$transaction') return true;
  if (name !== 'transaction') return false;
  const receiver = call.expression.expression.getText(sourceFile);
  return receiver === 'db' || receiver.endsWith('.db');
}

function serviceNodeForEffect(context: ScanContext, effect: SideEffect): GraphNode | undefined {
  const provider = effect.provider?.toLowerCase() || '';
  return context.builder.getNodes().find(node =>
    node.type === 'external_service' &&
    (node.displayName.toLowerCase() === provider ||
      (effect.kind === 'email' && node.metadata.category === 'email'))
  );
}

function addFinding(
  context: ScanContext,
  callerNode: GraphNode,
  helperNode: GraphNode,
  transactionCall: ts.CallExpression,
  transactionSource: ts.SourceFile,
  helperInvocation: ts.CallExpression,
  effect: SideEffect
) {
  const callRange = rangeOf(transactionSource, helperInvocation);
  const transactionRange = rangeOf(transactionSource, transactionCall);
  const suffix = `${callerNode.filePath}:${callRange.startLine}:${effect.filePath}:${effect.sourceRange.startLine}`;
  const findingId = `finding:${RULE_ID}:${suffix}`;
  const boundaryNode = context.builder.createAndAddNode({
    type: 'risk_boundary',
    key: `${RULE_ID}:${suffix}`,
    displayName: `${effect.kind.replace('_', ' ')} escapes transaction`,
    filePath: callerNode.filePath,
    sourceRange: callRange,
    metadata: {
      ruleId: RULE_ID,
      severity: 'high',
      status: 'confirmed',
      sideEffectKind: effect.kind,
      provider: effect.provider,
      transactionApi: transactionCall.expression.getText(transactionSource),
      findingId,
    },
    evidence: {
      detectorId: 'tx-escape',
      rule: 'side-effect-call-inside-transaction',
      filePath: callerNode.filePath,
      sourceRange: callRange,
      codeSnippet: helperInvocation.getText(transactionSource),
      notes: `This call occurs inside ${transactionCall.expression.getText(transactionSource)} and reaches a confirmed ${effect.kind} side effect.`,
    },
    tags: ['guardrail', 'tx-escape', 'risk', effect.kind],
  });

  const callEvidence: Evidence = {
    detectorId: 'tx-escape',
    rule: 'transaction-calls-side-effect-helper',
    filePath: callerNode.filePath,
    sourceRange: callRange,
    codeSnippet: helperInvocation.getText(transactionSource),
    notes: `The invocation is nested inside the transaction callback at line ${transactionRange.startLine}.`,
  };
  const effectEvidence: Evidence = {
    detectorId: 'tx-escape',
    rule: 'confirmed-external-side-effect',
    filePath: effect.filePath,
    sourceRange: effect.sourceRange,
    codeSnippet: effect.snippet,
    notes: `${effect.provider || 'External provider'} ${effect.kind} operation traced one helper call from the transaction.`,
  };

  context.builder.createAndAddEdge({
    source: callerNode.id,
    target: boundaryNode.id,
    type: 'violates',
    evidence: callEvidence,
  });
  context.builder.createAndAddEdge({
    source: boundaryNode.id,
    target: helperNode.id,
    type: 'traces_to',
    evidence: effectEvidence,
  });

  const affectedNodeIds = new Set([callerNode.id, helperNode.id, boundaryNode.id]);
  const serviceNode = serviceNodeForEffect(context, effect);
  if (serviceNode) affectedNodeIds.add(serviceNode.id);

  context.builder.addFinding({
    id: findingId,
    ruleId: RULE_ID,
    severity: 'high',
    status: 'confirmed',
    title: `TxEscape: ${effect.kind.replace('_', ' ')} is triggered inside a database transaction`,
    affectedNodeIds: Array.from(affectedNodeIds),
    sourceLocation: { filePath: callerNode.filePath!, sourceRange: callRange },
    evidence: [callEvidence, effectEvidence],
    explanation: `The database transaction can roll back after ${effect.provider || 'the provider'} has accepted the ${effect.kind.replace('_', ' ')}. That leaves the external side effect committed while the corresponding database state is absent or stale.`,
    suggestedAction: `Move the ${effect.kind.replace('_', ' ')} after a successful commit, or write an outbox record inside the transaction and process it idempotently after commit.`,
    metadata: {
      analyzer: 'TxEscape',
      transactionFile: callerNode.filePath,
      helperFile: helperNode.filePath,
      sideEffectKind: effect.kind,
      provider: effect.provider,
      traceDepth: helperNode.id === callerNode.id ? 0 : 1,
    },
  });
}

export const txEscapeRule: GuardrailRuleAdapter = {
  id: RULE_ID,
  name: 'TxEscape: external side effects inside database transactions',

  analyze(context: ScanContext) {
    for (const callerPath of context.tsJsFiles) {
      const callerContent = readSafeFile(path.join(context.rootPath, callerPath));
      if (!callerContent || (!callerContent.includes('$transaction') && !callerContent.includes('.transaction'))) continue;
      const callerSource = ts.createSourceFile(callerPath, callerContent, ts.ScriptTarget.Latest, true);
      const callerNode = graphNodeForFile(context, callerPath);
      if (!callerNode) continue;
      const helpers = localHelpers(callerSource, callerPath, context.tsJsFiles);

      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && isTransactionCall(node, callerSource)) {
          const callback = node.arguments.find(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg));
          if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) return;

          for (const directEffect of sideEffectsWithin(callerSource, callerPath, callback.body)) {
            const directCall = findCallAtRange(callback.body, callerSource, directEffect.sourceRange);
            if (directCall) addFinding(context, callerNode, callerNode, node, callerSource, directCall, directEffect);
          }

          const inspectHelperCalls = (candidate: ts.Node) => {
            if (ts.isCallExpression(candidate) && ts.isIdentifier(candidate.expression)) {
              const helper = helpers.get(candidate.expression.text);
              if (helper) {
                const helperContent = readSafeFile(path.join(context.rootPath, helper.targetPath));
                const helperNode = graphNodeForFile(context, helper.targetPath);
                if (helperContent && helperNode) {
                  const helperSource = ts.createSourceFile(helper.targetPath, helperContent, ts.ScriptTarget.Latest, true);
                  const body = findExportedHelperBody(helperSource, helper.importedName);
                  if (body) {
                    for (const effect of sideEffectsWithin(helperSource, helper.targetPath, body)) {
                      addFinding(context, callerNode, helperNode, node, callerSource, candidate, effect);
                    }
                  }
                }
              }
            }
            ts.forEachChild(candidate, inspectHelperCalls);
          };
          inspectHelperCalls(callback.body);
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(callerSource);
    }
  },
};

function findCallAtRange(
  root: ts.Node,
  sourceFile: ts.SourceFile,
  range: SourceRange
): ts.CallExpression | undefined {
  let result: ts.CallExpression | undefined;
  const visit = (node: ts.Node) => {
    if (result) return;
    if (ts.isCallExpression(node)) {
      const nodeRange = rangeOf(sourceFile, node);
      if (nodeRange.startLine === range.startLine && nodeRange.startColumn === range.startColumn) {
        result = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return result;
}
