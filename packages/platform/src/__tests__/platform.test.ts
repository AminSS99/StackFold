import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockPlatformAdapter,
  WebPlatformAdapter,
  TauriPlatformAdapter,
  getPlatformAdapter,
  setGlobalPlatformAdapter,
  isTauriEnvironment,
} from '../index';

describe('Platform Adapters Contract', () => {
  beforeEach(() => {
    setGlobalPlatformAdapter(null);
  });

  it('MockPlatformAdapter fulfills the full PlatformAdapter contract', async () => {
    const adapter = new MockPlatformAdapter();

    // 1. Folder picker
    const folder = await adapter.selectRepositoryFolder();
    expect(folder).toBe('/mock/workspace/project');

    // 2. Path validation
    const validRes = await adapter.validateRepository('/mock/workspace/project');
    expect(validRes.isValid).toBe(true);
    expect(validRes.projectName).toBe('project');

    const invalidRes = await adapter.validateRepository('');
    expect(invalidRes.isValid).toBe(false);

    // 3. Scan & progress
    const stagesSeen: string[] = [];
    const scanRes = await adapter.scanRepository(
      { rootPath: '/mock/workspace/project', projectName: 'demo-app' },
      p => stagesSeen.push(p.stage)
    );

    expect(stagesSeen).toContain('VALIDATING_PATH');
    expect(stagesSeen).toContain('COMPLETED');
    expect(scanRes.graph.nodes.length).toBeGreaterThan(0);
    expect(scanRes.graph.metadata.projectName).toBe('demo-app');

    // 4. Editor URL generation
    const vscodeOpen = await adapter.openInEditor('app/api/hello/route.ts', '/mock/workspace/project', 'vscode');
    expect(vscodeOpen.success).toBe(true);
    expect(vscodeOpen.url).toBe('vscode://file//mock/workspace/project/app/api/hello/route.ts');

    const cursorOpen = await adapter.openInEditor('app/api/hello/route.ts', '/mock/workspace/project', 'cursor');
    expect(cursorOpen.success).toBe(true);
    expect(cursorOpen.url).toBe('cursor://file//mock/workspace/project/app/api/hello/route.ts');

    // 5. Recent projects
    await adapter.saveRecentProject({
      path: '/mock/workspace/project',
      name: 'demo-app',
      lastScanned: new Date().toISOString(),
      nodeCount: 2,
    });

    const recents = await adapter.listRecentProjects();
    expect(recents.length).toBe(1);
    expect(recents[0]?.name).toBe('demo-app');

    await adapter.removeRecentProject('/mock/workspace/project');
    const recentsAfter = await adapter.listRecentProjects();
    expect(recentsAfter.length).toBe(0);
  });

  it('formats editor deep link URLs accurately for all supported editors', async () => {
    const webAdapter = new WebPlatformAdapter();

    const vscodeRes = await webAdapter.openInEditor('lib/prisma.ts', '/Users/dev/project', 'vscode');
    expect(vscodeRes.url).toBe('vscode://file//Users/dev/project/lib/prisma.ts');

    const cursorRes = await webAdapter.openInEditor('lib/prisma.ts', '/Users/dev/project', 'cursor');
    expect(cursorRes.url).toBe('cursor://file//Users/dev/project/lib/prisma.ts');

    const webstormRes = await webAdapter.openInEditor('lib/prisma.ts', '/Users/dev/project', 'webstorm');
    expect(webstormRes.url).toBe('webstorm://open?file=%2FUsers%2Fdev%2Fproject%2Flib%2Fprisma.ts');
  });

  it('detects desktop vs web environment accurately', () => {
    expect(isTauriEnvironment()).toBe(false);
    const adapter = getPlatformAdapter();
    expect(adapter.isDesktop()).toBe(false);
    expect(adapter.id).toBe('web');

    // Can override with global mock
    const mock = new MockPlatformAdapter();
    setGlobalPlatformAdapter(mock);
    expect(getPlatformAdapter().id).toBe('mock');
  });
});
