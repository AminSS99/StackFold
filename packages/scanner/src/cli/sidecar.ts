import { scanRepository } from '../index';
import { validateRepositoryPath } from '../security/path-validator';
import { ScanCacheManager } from '../cache/manager';

interface SidecarMessage {
  type: 'progress' | 'result' | 'error' | 'validation';
  stage?: string;
  message?: string;
  percentage?: number;
  data?: unknown;
  error?: string;
  code?: string;
}

function send(msg: SidecarMessage) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function main() {
  const command = process.argv[2];
  const payloadArg = process.argv[3];

  if (!command) {
    send({ type: 'error', error: 'No command specified', code: 'MISSING_COMMAND' });
    process.exit(1);
  }

  if (command === 'validate') {
    try {
      const targetPath = payloadArg || '';
      const result = validateRepositoryPath(targetPath);
      send({ type: 'validation', data: result });
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: msg, code: 'VALIDATION_FAILED' });
      process.exit(1);
    }
  }

  if (command === 'scan') {
    try {
      let params: { rootPath?: string; fixture?: string; projectName?: string; useCache?: boolean; maxFiles?: number } = {};
      if (payloadArg) {
        try {
          params = JSON.parse(payloadArg);
        } catch {
          params = { rootPath: payloadArg };
        }
      }

      if (!params.rootPath) {
        send({ type: 'error', error: 'rootPath is required for scan', code: 'MISSING_PATH' });
        process.exit(1);
      }

      const result = await scanRepository({
        rootPath: params.rootPath,
        projectName: params.projectName,
        useCache: params.useCache ?? false,
        maxFiles: params.maxFiles || 15000,
        onProgress: progress => {
          send({
            type: 'progress',
            stage: progress.stage,
            message: progress.message,
            percentage: progress.percentage,
          });
        },
      });

      send({ type: 'result', data: result });
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: msg, code: 'SCAN_FAILED' });
      process.exit(1);
    }
  }

  if (command === 'cache-load') {
    try {
      const rootPath = payloadArg || '';
      const cacheManager = new ScanCacheManager();
      const artifact = await cacheManager.loadArtifact(rootPath);
      send({ type: 'result', data: artifact });
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: msg, code: 'CACHE_LOAD_FAILED' });
      process.exit(1);
    }
  }

  if (command === 'cache-delete') {
    try {
      const rootPath = payloadArg || '';
      const cacheManager = new ScanCacheManager();
      const deleted = await cacheManager.invalidateArtifact(rootPath);
      send({ type: 'result', data: { success: deleted } });
      process.exit(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: msg, code: 'CACHE_DELETE_FAILED' });
      process.exit(1);
    }
  }

  send({ type: 'error', error: `Unknown command: ${command}`, code: 'UNKNOWN_COMMAND' });
  process.exit(1);
}

main().catch(err => {
  send({ type: 'error', error: err.message, code: 'FATAL_ERROR' });
  process.exit(1);
});
