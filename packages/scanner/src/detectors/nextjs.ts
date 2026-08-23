import path from 'node:path';
import ts from 'typescript';
import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export function normalizeRoutePath(filePath: string): { routePath: string; isDynamic: boolean; params: string[] } {
  const normalized = filePath.replace(/\\/g, '/');
  let clean = normalized;

  const appIdx = clean.indexOf('/app/');
  if (appIdx !== -1) {
    clean = clean.slice(appIdx + 5);
  } else if (clean.startsWith('app/')) {
    clean = clean.slice(4);
  } else {
    const pagesIdx = clean.indexOf('/pages/');
    if (pagesIdx !== -1) {
      clean = clean.slice(pagesIdx + 7);
    } else if (clean.startsWith('pages/')) {
      clean = clean.slice(6);
    }
  }

  clean = clean
    .replace(/\/route\.(ts|js|mjs|tsx|jsx)$/, '')
    .replace(/\/page\.(ts|js|mjs|tsx|jsx)$/, '')
    .replace(/\.(ts|js|mjs|tsx|jsx)$/, '')
    .replace(/^route$/, '');

  const segments = clean
    .split('/')
    .filter(seg => seg && !seg.startsWith('(') && !seg.endsWith(')'));

  const params: string[] = [];
  const normalizedSegments = segments.map(seg => {
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      const p = seg.slice(4, -1);
      params.push(p);
      return `*${p}`;
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      const p = seg.slice(1, -1);
      params.push(p);
      return `:${p}`;
    }
    return seg;
  });

  const routePath = '/' + normalizedSegments.join('/');
  const finalPath = routePath === '//' || routePath === '' ? '/' : routePath;

  return {
    routePath: finalPath,
    isDynamic: params.length > 0,
    params,
  };
}

export function extractAppRouteMethods(sourceFile: ts.SourceFile): string[] {
  const methods: string[] = [];

  ts.forEachChild(sourceFile, node => {
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const name = node.name?.text;
      if (name && HTTP_METHODS.includes(name as any)) {
        methods.push(name);
      }
    }
    if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (HTTP_METHODS.includes(name as any)) {
            methods.push(name);
          }
        }
      }
    }
  });

  return methods.length > 0 ? methods : ['ALL'];
}

export const nextjsDetector: DetectorInterface = {
  id: 'nextjs-detector',
  name: 'Next.js Route and Page Detector',

  async run(context: ScanContext) {
    const { rootPath, builder, tsJsFiles } = context;

    for (const relPath of tsJsFiles) {
      const isAppRoute = /\/app\/.*\/route\.(ts|js|mjs|tsx|jsx)$/.test(relPath) || /^app\/.*\/route\.(ts|js|mjs|tsx|jsx)$/.test(relPath);
      const isAppPage = /\/app\/.*\/page\.(ts|js|mjs|tsx|jsx)$/.test(relPath) || /^app\/.*\/page\.(ts|js|mjs|tsx|jsx)$/.test(relPath);
      const isPagesApi = /\/pages\/api\/.*\.(ts|js|mjs|tsx|jsx)$/.test(relPath) || /^pages\/api\/.*\.(ts|js|mjs|tsx|jsx)$/.test(relPath);
      const isPagesPage = (/\/pages\/.*\.(ts|js|mjs|tsx|jsx)$/.test(relPath) || /^pages\/.*\.(ts|js|mjs|tsx|jsx)$/.test(relPath)) && !isPagesApi;

      if (!isAppRoute && !isAppPage && !isPagesApi && !isPagesPage) {
        continue;
      }

      context.frameworks.add('Next.js');

      const fullPath = path.join(rootPath, relPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      const sourceFile = ts.createSourceFile(
        relPath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const { routePath, isDynamic, params } = normalizeRoutePath(relPath);
      const isClientComponent = content.includes('"use client"') || content.includes("'use client'");

      let parentAppId: string | undefined;
      const parts = relPath.split('/');
      if (parts[0] === 'apps' && parts[1]) {
        parentAppId = `application:apps/${parts[1]}`;
      } else {
        const nodes = builder.getNodes();
        const appNode = nodes.find(n => n.type === 'application');
        if (appNode) parentAppId = appNode.id;
      }

      if (isAppRoute || isPagesApi) {
        const methods = isAppRoute ? extractAppRouteMethods(sourceFile) : ['ANY'];

        for (const method of methods) {
          const key = `${relPath}:${method}`;
          const routeNode = builder.createAndAddNode({
            type: 'api_route',
            key,
            displayName: `${method} ${routePath}`,
            filePath: relPath,
            metadata: {
              httpMethod: method,
              routePath,
              isDynamic,
              params,
              routerType: isAppRoute ? 'app' : 'pages',
            },
            evidence: {
              detectorId: nextjsDetector.id,
              rule: isAppRoute ? 'app-router-endpoint' : 'pages-router-endpoint',
              filePath: relPath,
              codeSnippet: `export async function ${method}(...)`,
            },
            tags: ['api', method.toLowerCase(), isDynamic ? 'dynamic' : 'static'],
          });

          if (parentAppId && builder.hasNode(parentAppId)) {
            builder.createAndAddEdge({
              source: parentAppId,
              target: routeNode.id,
              type: 'exposes',
              evidence: {
                detectorId: nextjsDetector.id,
                rule: 'app-exposes-api',
                filePath: relPath,
              },
            });
          }
        }
      } else if (isAppPage || isPagesPage) {
        const pageNode = builder.createAndAddNode({
          type: 'component',
          key: relPath,
          displayName: `Page: ${routePath}`,
          filePath: relPath,
          metadata: {
            routePath,
            isDynamic,
            params,
            isClientComponent,
            routerType: isAppPage ? 'app' : 'pages',
          },
          evidence: {
            detectorId: nextjsDetector.id,
            rule: isAppPage ? 'app-router-page' : 'pages-router-page',
            filePath: relPath,
            codeSnippet: isClientComponent ? "'use client'" : 'export default function Page()',
          },
          tags: ['page', isClientComponent ? 'client' : 'server', isDynamic ? 'dynamic' : 'static'],
        });

        if (parentAppId && builder.hasNode(parentAppId)) {
          builder.createAndAddEdge({
            source: parentAppId,
            target: pageNode.id,
            type: 'exposes',
            evidence: {
              detectorId: nextjsDetector.id,
              rule: 'app-exposes-page',
              filePath: relPath,
            },
          });
        }
      }
    }
  },
};
