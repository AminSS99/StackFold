import { setGlobalPlatformAdapter, StaticDemoPlatformAdapter } from '@stackfold/platform';
import { IS_STATIC_DEMO, DEMO_BASE_PATH } from '@/lib/demo';
import { STACKFOLD_REPOSITORY } from '@/config/links';

// Runs once at client module-evaluation time, before any component asks for an adapter.
if (typeof window !== 'undefined' && IS_STATIC_DEMO) {
  setGlobalPlatformAdapter(
    new StaticDemoPlatformAdapter({ basePath: DEMO_BASE_PATH, repositoryUrl: STACKFOLD_REPOSITORY })
  );
}
