import { describe, it, expect } from 'vitest';
import {
  MockPlatformAdapter,
  WebPlatformAdapter,
  TauriPlatformAdapter,
  getPlatformAdapter,
  setGlobalPlatformAdapter,
} from '../index';

describe('Platform Adapter E2E Smoke & Contract Tests', () => {
  it('executes full scan workflow via PlatformAdapter without throwing', async () => {
    const mockAdapter = new MockPlatformAdapter();
    setGlobalPlatformAdapter(mockAdapter);

    const adapter = getPlatformAdapter();
    expect(adapter.id).toBe('mock');

    // 1. Folder picker
    const folder = await adapter.selectRepositoryFolder();
    expect(folder).toBe('/mock/workspace/project');

    // 2. Validate
    const validation = await adapter.validateRepository(folder!);
    expect(validation.isValid).toBe(true);

    // 3. Scan with progress
    const stages: string[] = [];
    const scanResult = await adapter.scanRepository(
      { rootPath: folder!, projectName: 'Test Platform' },
      p => stages.push(p.stage)
    );

    expect(stages.length).toBeGreaterThan(1);
    expect(scanResult.graph.metadata.projectName).toBe('Test Platform');
    expect(scanResult.graph.nodes.length).toBeGreaterThan(0);

    // 4. Update Window Title
    await adapter.setWindowTitle(`Stackfold — ${scanResult.graph.metadata.projectName}`);
    expect(mockAdapter.windowTitle).toBe('Stackfold — Test Platform');

    // 5. Open In Editor for various choices
    const vscode = await adapter.openInEditor('src/index.ts', folder!, 'vscode');
    expect(vscode.url).toBe('vscode://file//mock/workspace/project/src/index.ts');

    const cursor = await adapter.openInEditor('src/index.ts', folder!, 'cursor');
    expect(cursor.url).toBe('cursor://file//mock/workspace/project/src/index.ts');

    const webstorm = await adapter.openInEditor('src/index.ts', folder!, 'webstorm');
    expect(webstorm.url).toBe('webstorm://file//mock/workspace/project/src/index.ts');
  });

  it('handles scan cancellation via AbortSignal in platform adapter', async () => {
    const mockAdapter = new MockPlatformAdapter();
    const controller = new AbortController();
    controller.abort();

    await expect(
      mockAdapter.scanRepository(
        { rootPath: '/mock/workspace/project' },
        undefined,
        controller.signal
      )
    ).rejects.toThrow('Scan aborted by user');

    expect(mockAdapter.aborted).toBe(true);
  });

  it('validates paths and rejects invalid paths', async () => {
    const adapter = new MockPlatformAdapter();

    const empty = await adapter.validateRepository('');
    expect(empty.isValid).toBe(false);

    const invalid = await adapter.validateRepository('/invalid/path/test');
    expect(invalid.isValid).toBe(false);
  });
});
