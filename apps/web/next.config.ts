import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  transpilePackages: ['@stackfold/graph', '@stackfold/platform', '@stackfold/scanner'],
  serverExternalPackages: ['typescript', 'fast-glob'],
};

export default nextConfig;
