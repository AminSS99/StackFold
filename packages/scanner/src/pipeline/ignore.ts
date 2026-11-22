import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_EXCLUSIONS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.turbo/**',
  '**/out/**',
  '**/.output/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/.husky/**',
  '**/.vscode/**',
  '**/.idea/**',
  '**/*.log',
  '**/*.lock',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.svg',
  '**/*.ico',
  '**/*.webp',
  '**/*.pdf',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/*.mp4',
  '**/*.woff',
  '**/*.woff2',
  '**/*.ttf',
  '**/*.eot',
  // Explicitly ignore active environment files, private keys, and credential files
  '**/.env',
  '**/.env.local',
  '**/.env.production',
  '**/.env.development',
  '**/.env.test',
  '**/.env.staging',
  '**/.env.preview',
  '**/.env.*.local',
  '**/.env.vault',
  '**/.envrc',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/*.pfx',
  '**/*.jks',
  '**/*.keystore',
  '**/id_rsa*',
  '**/id_ed25519*',
  '**/.npmrc',
  '**/.pypirc',
  '**/.netrc',
  '**/.dockercfg',
  '**/.ssh/**',
  '**/.aws/**',
  '**/.gnupg/**',
  '**/.kube/**',
];

export function loadIgnorePatterns(rootPath: string): string[] {
  const patterns = [...DEFAULT_EXCLUSIONS];

  const gitignorePath = path.join(rootPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      for (const line of lines) {
        if (!patterns.includes(line)) {
          patterns.push(line.endsWith('/') ? `**/${line}**` : `**/${line}`);
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  const stackfoldIgnorePath = path.join(rootPath, '.stackfoldignore');
  if (fs.existsSync(stackfoldIgnorePath)) {
    try {
      const content = fs.readFileSync(stackfoldIgnorePath, 'utf8');
      const lines = content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      for (const line of lines) {
        patterns.push(line.endsWith('/') ? `**/${line}**` : `**/${line}`);
      }
    } catch {
      // Graceful fallback
    }
  }

  return patterns;
}
