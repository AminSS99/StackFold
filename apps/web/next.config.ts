import path from 'node:path';
import type { NextConfig } from 'next';

// Static desktop export (Tauri) must not bundle Clerk server actions:
// `@clerk/nextjs` ships `'use server'` modules which Next.js rejects under
// `output: export`. When NEXT_EXPORT=true we alias both Clerk entrypoints to
// local stubs, so the desktop bundle stays local-first with zero cloud
// references. Web deployments keep the real Clerk integration.
const isStaticExport = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : undefined,
  transpilePackages: ['@stackfold/graph', '@stackfold/platform', '@stackfold/scanner'],
  serverExternalPackages: ['typescript', 'fast-glob', 'playwright'],
  ...(isStaticExport
    ? {
        turbopack: {
          resolveAlias: {
            '@clerk/nextjs/server': './src/stubs/clerk-nextjs-server.ts',
            '@clerk/nextjs': './src/stubs/clerk-nextjs.tsx',
          },
        },
        webpack: (config: { resolve: { alias?: Record<string, string> } }) => {
          config.resolve.alias = {
            ...config.resolve.alias,
            '@clerk/nextjs/server': path.resolve(__dirname, 'src/stubs/clerk-nextjs-server.ts'),
            '@clerk/nextjs': path.resolve(__dirname, 'src/stubs/clerk-nextjs.tsx'),
          };
          return config;
        },
      }
    : {}),
};

export default nextConfig;
