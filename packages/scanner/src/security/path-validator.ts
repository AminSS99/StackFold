import fs from 'node:fs';
import path from 'node:path';

export interface PathValidationResult {
  isValid: boolean;
  canonicalPath?: string;
  projectName?: string;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasPrisma: boolean;
  isMonorepo: boolean;
  errorCode?: string;
  errorMessage?: string;
}

const FORBIDDEN_ROOTS = new Set([
  '/',
  '/root',
  '/System',
  '/System/Library',
  '/etc',
  '/private',
  '/private/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/dev',
  '/proc',
  '/sys',
  '/var',
  '/var/root',
  '/var/log',
  '/var/run',
  '/var/db',
  '/Windows',
  '/Windows/System32',
  'C:\\',
  'C:\\Windows',
  'C:\\Windows\\System32',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
]);

const FORBIDDEN_SYSTEM_PREFIXES = [
  '/System/',
  '/etc/',
  '/private/etc/',
  '/usr/',
  '/bin/',
  '/sbin/',
  '/dev/',
  '/proc/',
  '/sys/',
  '/var/root/',
  '/var/log/',
  '/var/run/',
  '/var/db/',
];

const FORBIDDEN_CREDENTIAL_SEGMENTS = new Set([
  '.ssh',
  '.aws',
  '.gnupg',
  '.kube',
  '.docker',
  '.npmrc',
]);

function isForbiddenSystemPath(p: string): boolean {
  if (FORBIDDEN_ROOTS.has(p) || p === path.parse(p).root) return true;
  for (const prefix of FORBIDDEN_SYSTEM_PREFIXES) {
    if (p.startsWith(prefix)) return true;
  }
  const segments = p.split(/[\\/]+/);
  return segments.some(seg => FORBIDDEN_CREDENTIAL_SEGMENTS.has(seg));
}

export function validateRepositoryPath(targetPath: string): PathValidationResult {
  if (!targetPath || typeof targetPath !== 'string' || !targetPath.trim()) {
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'EMPTY_PATH',
      errorMessage: 'Repository path cannot be empty.',
    };
  }

  if (targetPath.includes('\0')) {
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'INVALID_PATH',
      errorMessage: 'Repository path contains invalid characters.',
    };
  }

  const resolved = path.resolve(targetPath.trim());

  // Check forbidden system roots & credential directories
  if (isForbiddenSystemPath(resolved)) {
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'FORBIDDEN_SYSTEM_ROOT',
      errorMessage: `Scanning system or protected directory '${resolved}' is rejected for safety.`,
    };
  }

  // Check existence
  if (!fs.existsSync(resolved)) {
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'PATH_NOT_FOUND',
      errorMessage: `Directory does not exist: ${resolved}`,
    };
  }

  // Canonicalize symlinks safely
  let canonicalPath: string;
  try {
    canonicalPath = fs.realpathSync(resolved);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'CANONICALIZATION_FAILED',
      errorMessage: `Failed to resolve real path: ${msg}`,
    };
  }

  if (isForbiddenSystemPath(canonicalPath)) {
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'FORBIDDEN_SYSTEM_ROOT',
      errorMessage: `Scanning system or protected directory '${canonicalPath}' is rejected for safety.`,
    };
  }

  // Check if directory
  try {
    const stats = fs.statSync(canonicalPath);
    if (!stats.isDirectory()) {
      return {
        isValid: false,
        hasPackageJson: false,
        hasTsConfig: false,
        hasPrisma: false,
        isMonorepo: false,
        errorCode: 'NOT_A_DIRECTORY',
        errorMessage: `Path is a file, not a directory: ${canonicalPath}`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      hasPackageJson: false,
      hasTsConfig: false,
      hasPrisma: false,
      isMonorepo: false,
      errorCode: 'ACCESS_ERROR',
      errorMessage: `Cannot access path stats: ${msg}`,
    };
  }

  // Inspect project markers
  const hasPackageJson = fs.existsSync(path.join(canonicalPath, 'package.json'));
  const hasTsConfig = fs.existsSync(path.join(canonicalPath, 'tsconfig.json'));
  const hasPrisma =
    fs.existsSync(path.join(canonicalPath, 'prisma', 'schema.prisma')) ||
    fs.existsSync(path.join(canonicalPath, 'schema.prisma'));
  const isMonorepo =
    fs.existsSync(path.join(canonicalPath, 'pnpm-workspace.yaml')) ||
    fs.existsSync(path.join(canonicalPath, 'lerna.json')) ||
    (hasPackageJson && (() => {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(canonicalPath, 'package.json'), 'utf8'));
        return !!pkg.workspaces;
      } catch {
        return false;
      }
    })());

  let projectName = path.basename(canonicalPath);
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(canonicalPath, 'package.json'), 'utf8'));
      if (pkg.name) projectName = pkg.name;
    } catch {
      // Graceful fallback
    }
  }

  return {
    isValid: true,
    canonicalPath,
    projectName,
    hasPackageJson,
    hasTsConfig,
    hasPrisma,
    isMonorepo,
  };
}
