import fs from 'node:fs';
import path from 'node:path';
import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';

export const workspaceDetector: DetectorInterface = {
  id: 'workspace-detector',
  name: 'Workspace and Package Detector',

  async run(context: ScanContext) {
    const { rootPath, builder, packageJsonFiles, frameworks } = context;

    if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml')) || fs.existsSync(path.join(rootPath, 'pnpm-workspace.yaml'))) {
      context.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(rootPath, 'yarn.lock'))) {
      context.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(rootPath, 'bun.lockb')) || fs.existsSync(path.join(rootPath, 'bun.lock'))) {
      context.packageManager = 'bun';
    } else if (fs.existsSync(path.join(rootPath, 'package-lock.json'))) {
      context.packageManager = 'npm';
    } else {
      context.packageManager = 'unknown';
    }

    const repoNode = builder.createAndAddNode({
      type: 'repository',
      key: context.projectName,
      displayName: context.projectName,
      filePath: '.',
      metadata: {
        packageManager: context.packageManager,
        totalFiles: context.fileList.length,
      },
      evidence: {
        detectorId: workspaceDetector.id,
        rule: 'repository-root',
        filePath: 'package.json',
      },
      tags: ['root', context.packageManager],
    });

    const discoveredPackages: Array<{ id: string; name: string; dir: string; pkgJson: any; isApp: boolean }> = [];

    for (const pkgRelPath of packageJsonFiles) {
      const fullPath = path.join(rootPath, pkgRelPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      let pkg: any;
      try {
        pkg = JSON.parse(content);
      } catch {
        context.diagnostics.push({
          level: 'error',
          code: 'INVALID_PACKAGE_JSON',
          message: `Malformed JSON in package.json at ${pkgRelPath}`,
          filePath: pkgRelPath,
        });
        continue;
      }

      const pkgDir = path.dirname(pkgRelPath).replace(/\\/g, '/');
      const isRoot = pkgDir === '.' || pkgDir === '';
      const isApp =
        pkgDir.startsWith('apps/') ||
        pkgDir.startsWith('packages/app') ||
        !!(pkg.dependencies?.next || pkg.dependencies?.react || pkg.scripts?.dev || pkg.scripts?.start);

      const nodeType = isRoot ? (packageJsonFiles.length === 1 ? 'application' : 'package') : (isApp ? 'application' : 'package');
      const displayName = pkg.name || (isRoot ? context.projectName : path.basename(pkgDir));

      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps.next) frameworks.add('Next.js');
      if (allDeps.react) frameworks.add('React');
      if (allDeps.prisma || allDeps['@prisma/client']) frameworks.add('Prisma');
      if (allDeps.tailwindcss) frameworks.add('Tailwind CSS');
      if (allDeps.typescript) frameworks.add('TypeScript');
      if (allDeps.express) frameworks.add('Express');
      if (allDeps.fastify) frameworks.add('Fastify');
      if (allDeps.stripe) frameworks.add('Stripe');
      if (allDeps.resend) frameworks.add('Resend');

      const tags = [nodeType];
      if (allDeps.next) tags.push('nextjs');
      if (allDeps.react) tags.push('react');
      if (allDeps.prisma) tags.push('prisma');
      if (pkg.private) tags.push('private');

      const pkgNode = builder.createAndAddNode({
        type: nodeType,
        key: pkgDir === '.' ? displayName : pkgDir,
        displayName,
        filePath: pkgRelPath,
        metadata: {
          packageName: pkg.name,
          version: pkg.version || '0.0.0',
          private: !!pkg.private,
          scripts: Object.keys(pkg.scripts || {}),
          dependenciesCount: Object.keys(pkg.dependencies || {}).length,
          devDependenciesCount: Object.keys(pkg.devDependencies || {}).length,
          dependencies: Object.keys(pkg.dependencies || {}),
        },
        evidence: {
          detectorId: workspaceDetector.id,
          rule: isApp ? 'application-manifest' : 'package-manifest',
          filePath: pkgRelPath,
          codeSnippet: `"name": "${pkg.name || displayName}"`,
        },
        tags,
      });

      if (!isRoot) {
        builder.createAndAddEdge({
          source: repoNode.id,
          target: pkgNode.id,
          type: 'contains',
          evidence: {
            detectorId: workspaceDetector.id,
            rule: 'repo-contains-package',
            filePath: pkgRelPath,
          },
        });
      }

      discoveredPackages.push({
        id: pkgNode.id,
        name: pkg.name || displayName,
        dir: pkgDir,
        pkgJson: pkg,
        isApp,
      });
    }

    for (const sourcePkg of discoveredPackages) {
      const allDeps = {
        ...(sourcePkg.pkgJson.dependencies || {}),
        ...(sourcePkg.pkgJson.devDependencies || {}),
      };

      for (const targetPkg of discoveredPackages) {
        if (sourcePkg.id === targetPkg.id) continue;
        if (allDeps[targetPkg.name] !== undefined) {
          builder.createAndAddEdge({
            source: sourcePkg.id,
            target: targetPkg.id,
            type: 'depends_on',
            metadata: {
              versionSpec: allDeps[targetPkg.name],
            },
            evidence: {
              detectorId: workspaceDetector.id,
              rule: 'workspace-dependency',
              filePath: path.join(sourcePkg.dir, 'package.json').replace(/\\/g, '/'),
              codeSnippet: `"${targetPkg.name}": "${allDeps[targetPkg.name]}"`,
            },
          });
        }
      }
    }
  },
};
