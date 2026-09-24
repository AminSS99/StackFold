import path from 'node:path';
import ts from 'typescript';
import { z } from 'zod';
import type { Evidence, GraphNode, SourceRange } from '@stackfold/graph';
import type { ScanContext } from '../../types';
import { readSafeFile } from '../../utils/file-system';
import type { GuardrailRuleAdapter } from '../types';

const RULE_ID = 'guardrails/scope-patch/missing-github-app-permission';
const permissionLevelSchema = z.enum(['read', 'write']);

export const scopePatchConfigSchema = z.object({
  schemaVersion: z.literal(1),
  appSlug: z.string().min(1),
  permissions: z.record(permissionLevelSchema).default({}),
});

export type ScopePatchConfig = z.infer<typeof scopePatchConfigSchema>;

interface RequiredPermission {
  scope: string;
  level: 'read' | 'write';
  operation: string;
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

function propertyChain(expression: ts.Expression): string[] | undefined {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (!ts.isPropertyAccessExpression(expression)) return undefined;
  const parent = propertyChain(expression.expression);
  return parent ? [...parent, expression.name.text] : undefined;
}

function importedOctokitConstructors(sourceFile: ts.SourceFile): Set<string> {
  const constructors = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!['octokit', '@octokit/rest', '@octokit/core'].includes(statement.moduleSpecifier.text)) continue;
    if (statement.importClause?.name) constructors.add(statement.importClause.name.text);
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if ((element.propertyName?.text || element.name.text) === 'Octokit') {
          constructors.add(element.name.text);
        }
      }
    }
  }
  return constructors;
}

function octokitClients(sourceFile: ts.SourceFile): Set<string> {
  const constructors = importedOctokitConstructors(sourceFile);
  const clients = new Set<string>();
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isNewExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      constructors.has(node.initializer.expression.text)
    ) {
      clients.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return clients;
}

const WRITE_METHODS = new Set([
  'create', 'update', 'delete', 'merge', 'lock', 'unlock', 'addAssignees', 'removeAssignees',
  'setLabels', 'addLabels', 'removeLabel', 'createComment', 'updateComment', 'deleteComment',
  'requestReviewers', 'removeRequestedReviewers', 'updateBranch', 'createOrUpdateFileContents',
  'deleteFile', 'createWorkflowDispatch', 'rerunWorkflow', 'cancelWorkflowRun', 'createCheckRun',
  'updateCheckRun',
]);

const REST_SCOPES: Record<string, string> = {
  issues: 'issues',
  pulls: 'pull_requests',
  checks: 'checks',
  actions: 'actions',
};

function permissionForRest(namespace: string, method: string): RequiredPermission | undefined {
  if (namespace === 'repos') {
    const contentsMethods = new Set([
      'getContent', 'downloadZipballArchive', 'downloadTarballArchive',
      'createOrUpdateFileContents', 'deleteFile',
    ]);
    if (!contentsMethods.has(method)) return undefined;
    return {
      scope: 'contents',
      level: WRITE_METHODS.has(method) ? 'write' : 'read',
      operation: `repos.${method}`,
    };
  }

  const scope = REST_SCOPES[namespace];
  if (!scope) return undefined;
  return {
    scope,
    level: WRITE_METHODS.has(method) ? 'write' : 'read',
    operation: `${namespace}.${method}`,
  };
}

function permissionForRequestRoute(route: string): RequiredPermission | undefined {
  const normalized = route.trim().replace(/\s+/g, ' ');
  const match = /^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/.exec(normalized);
  if (!match) return undefined;
  const method = match[1]!;
  const endpoint = match[2]!;
  const level: 'read' | 'write' = method === 'GET' ? 'read' : 'write';

  if (/\/repos\/[^/]+\/[^/]+\/issues(?:\/|$)/.test(endpoint)) {
    return { scope: 'issues', level, operation: normalized };
  }
  if (/\/repos\/[^/]+\/[^/]+\/pulls(?:\/|$)/.test(endpoint)) {
    return { scope: 'pull_requests', level, operation: normalized };
  }
  if (/\/repos\/[^/]+\/[^/]+\/contents(?:\/|$)/.test(endpoint)) {
    return { scope: 'contents', level, operation: normalized };
  }
  if (/\/repos\/[^/]+\/[^/]+\/actions(?:\/|$)/.test(endpoint)) {
    return { scope: 'actions', level, operation: normalized };
  }
  if (/\/repos\/[^/]+\/[^/]+\/check-runs(?:\/|$)/.test(endpoint)) {
    return { scope: 'checks', level, operation: normalized };
  }
  return undefined;
}

function permissionForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  clients: Set<string>
): RequiredPermission | undefined {
  const chain = propertyChain(call.expression);
  if (!chain || !clients.has(chain[0]!)) return undefined;

  // ScopePatch intentionally excludes GraphQL in the REST-first implementation.
  if (chain.includes('graphql')) return undefined;

  const restIndex = chain.indexOf('rest');
  if (restIndex >= 0 && chain.length >= restIndex + 3) {
    return permissionForRest(chain[restIndex + 1]!, chain[restIndex + 2]!);
  }

  if (chain.at(-1) === 'request') {
    const route = call.arguments[0];
    if (route && (ts.isStringLiteral(route) || ts.isNoSubstitutionTemplateLiteral(route))) {
      return permissionForRequestRoute(route.text);
    }
  }
  return undefined;
}

function hasPermission(declared: 'read' | 'write' | undefined, required: 'read' | 'write'): boolean {
  return declared === 'write' || (declared === 'read' && required === 'read');
}

export function parseScopePatchConfig(content: string): ScopePatchConfig {
  return scopePatchConfigSchema.parse(JSON.parse(content));
}

function analyzeCall(
  context: ScanContext,
  config: ScopePatchConfig,
  configPath: string,
  configContent: string,
  filePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  permission: RequiredPermission
) {
  const sourceNode = graphNodeForFile(context, filePath);
  if (!sourceNode) return;
  const callRange = rangeOf(sourceFile, call);
  const callEvidence: Evidence = {
    detectorId: 'scope-patch',
    rule: 'github-rest-operation',
    filePath,
    sourceRange: callRange,
    codeSnippet: call.getText(sourceFile),
    notes: `${permission.operation} requires GitHub App '${permission.scope}: ${permission.level}'.`,
  };
  const operationNode = context.builder.createAndAddNode({
    type: 'api_operation',
    key: `github-rest:${permission.operation}:${filePath}:${callRange.startLine}`,
    displayName: permission.operation,
    filePath,
    sourceRange: callRange,
    metadata: {
      provider: 'GitHub',
      protocol: 'REST',
      permission: permission.scope,
      requiredLevel: permission.level,
    },
    evidence: callEvidence,
    tags: ['scope-patch', 'github', 'rest'],
  });
  const declared = config.permissions[permission.scope];
  const scopeEvidence: Evidence = {
    detectorId: 'scope-patch',
    rule: declared ? 'github-app-declared-permission' : 'github-app-missing-permission',
    filePath: configPath,
    sourceRange: configRange(configContent, permission.scope),
    codeSnippet: declared
      ? `\"${permission.scope}\": \"${declared}\"`
      : `permissions.${permission.scope} is not declared`,
    notes: `Compared against the explicit local permission manifest for '${config.appSlug}'.`,
  };
  const scopeNode = context.builder.createAndAddNode({
    type: 'permission_scope',
    key: `github-app:${config.appSlug}:${permission.scope}`,
    displayName: `${permission.scope}: ${declared || 'missing'}`,
    filePath: configPath,
    sourceRange: scopeEvidence.sourceRange,
    metadata: {
      provider: 'GitHub App',
      appSlug: config.appSlug,
      permission: permission.scope,
      declaredLevel: declared || 'missing',
      requiredLevel: permission.level,
      sufficient: hasPermission(declared, permission.level),
    },
    evidence: scopeEvidence,
    confidence: 'HIGH',
    tags: ['scope-patch', 'github-app', hasPermission(declared, permission.level) ? 'sufficient' : 'risk'],
  });
  context.builder.createAndAddEdge({
    source: sourceNode.id,
    target: operationNode.id,
    type: 'calls',
    evidence: callEvidence,
  });
  context.builder.createAndAddEdge({
    source: operationNode.id,
    target: scopeNode.id,
    type: 'requires',
    metadata: { requiredLevel: permission.level },
    evidence: callEvidence,
  });

  if (hasPermission(declared, permission.level)) return;

  const suffix = `${filePath}:${callRange.startLine}:${permission.scope}`;
  const findingId = `finding:${RULE_ID}:${suffix}`;
  const boundaryNode = context.builder.createAndAddNode({
    type: 'risk_boundary',
    key: `${RULE_ID}:${suffix}`,
    displayName: `missing ${permission.scope} permission`,
    filePath,
    sourceRange: callRange,
    metadata: {
      ruleId: RULE_ID,
      severity: 'high',
      status: 'confirmed',
      provider: 'GitHub',
      requiredPermission: permission.scope,
      requiredLevel: permission.level,
      declaredLevel: declared || 'missing',
      findingId,
      patchOperation: 'add',
      patchPath: `/permissions/${permission.scope}`,
      patchValue: permission.level,
    },
    evidence: callEvidence,
    tags: ['guardrail', 'scope-patch', 'risk', 'github'],
  });
  context.builder.createAndAddEdge({
    source: sourceNode.id,
    target: boundaryNode.id,
    type: 'violates',
    evidence: callEvidence,
  });
  context.builder.createAndAddEdge({
    source: boundaryNode.id,
    target: scopeNode.id,
    type: 'traces_to',
    evidence: scopeEvidence,
  });

  const patch = { permissions: { [permission.scope]: permission.level } };
  context.builder.addFinding({
    id: findingId,
    ruleId: RULE_ID,
    severity: 'high',
    status: 'confirmed',
    title: `ScopePatch: ${permission.operation} requires '${permission.scope}: ${permission.level}'`,
    affectedNodeIds: [sourceNode.id, operationNode.id, scopeNode.id, boundaryNode.id],
    sourceLocation: { filePath, sourceRange: callRange },
    evidence: [callEvidence, scopeEvidence],
    explanation: `The GitHub REST call '${permission.operation}' requires '${permission.scope}: ${permission.level}', but the local GitHub App manifest declares '${declared || 'no permission'}'. The installation token can therefore fail with a resource-not-accessible or forbidden response.`,
    suggestedAction: `Review and add this permission without removing any existing permissions: ${JSON.stringify(patch)}. Re-authorize affected GitHub App installations after updating the manifest.`,
    metadata: {
      analyzer: 'ScopePatch',
      provider: 'github',
      protocol: 'REST',
      operation: permission.operation,
      requiredPermission: permission.scope,
      requiredLevel: permission.level,
      declaredLevel: declared || 'missing',
      additivePatch: {
        op: 'add',
        path: `/permissions/${permission.scope}`,
        value: permission.level,
      },
      removesPermissions: false,
    },
  });
}

export const scopePatchRule: GuardrailRuleAdapter = {
  id: RULE_ID,
  name: 'ScopePatch: GitHub REST calls to GitHub App permissions',

  analyze(context: ScanContext) {
    for (const configPath of context.scopePatchConfigFiles) {
      const configContent = readSafeFile(path.join(context.rootPath, configPath));
      if (!configContent) continue;
      let config: ScopePatchConfig;
      try {
        config = parseScopePatchConfig(configContent);
      } catch (error) {
        context.diagnostics.push({
          level: 'warning',
          code: 'SCOPE_PATCH_INVALID_CONFIG',
          message: `ScopePatch skipped invalid configuration at '${configPath}'.`,
          filePath: configPath,
          details: { reason: error instanceof Error ? error.message : String(error) },
        });
        continue;
      }

      const applicationNode = context.builder.getNodes().find(node => node.type === 'application');
      for (const [permission, level] of Object.entries(config.permissions)) {
        const evidence: Evidence = {
          detectorId: 'scope-patch',
          rule: 'github-app-declared-permission',
          filePath: configPath,
          sourceRange: configRange(configContent, permission),
          codeSnippet: `\"${permission}\": \"${level}\"`,
        };
        const scopeNode = context.builder.createAndAddNode({
          type: 'permission_scope',
          key: `github-app:${config.appSlug}:${permission}`,
          displayName: `${permission}: ${level}`,
          filePath: configPath,
          sourceRange: evidence.sourceRange,
          metadata: { provider: 'GitHub App', appSlug: config.appSlug, permission, declaredLevel: level },
          evidence,
          tags: ['scope-patch', 'github-app', 'declared'],
        });
        if (applicationNode) {
          context.builder.createAndAddEdge({
            source: applicationNode.id,
            target: scopeNode.id,
            type: 'declares',
            evidence,
          });
        }
      }

      for (const filePath of context.tsJsFiles) {
        const content = readSafeFile(path.join(context.rootPath, filePath));
        if (!content || (!content.includes('octokit') && !content.includes('Octokit'))) continue;
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const clients = octokitClients(sourceFile);
        if (clients.size === 0) continue;
        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const permission = permissionForCall(node, sourceFile, clients);
            if (permission) {
              analyzeCall(context, config, configPath, configContent, filePath, sourceFile, node, permission);
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(sourceFile);
      }
    }
  },
};
