import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@stackfold/graph', '@stackfold/scanner'],
  serverExternalPackages: ['typescript', 'fast-glob'],
};

export default nextConfig;
