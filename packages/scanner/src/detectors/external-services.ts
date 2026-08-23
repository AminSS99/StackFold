import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';
import path from 'node:path';

interface ServiceSignature {
  name: string;
  category: 'payment' | 'email' | 'ai' | 'database' | 'storage' | 'auth' | 'cache' | 'analytics';
  packages: string[];
  description: string;
}

const KNOWN_SERVICES: ServiceSignature[] = [
  {
    name: 'Stripe',
    category: 'payment',
    packages: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'],
    description: 'Payment processing platform & webhooks',
  },
  {
    name: 'Resend',
    category: 'email',
    packages: ['resend', '@react-email/components'],
    description: 'Transactional email API delivery',
  },
  {
    name: 'OpenAI',
    category: 'ai',
    packages: ['openai', '@ai-sdk/openai'],
    description: 'Generative AI LLM & embedding platform',
  },
  {
    name: 'Anthropic',
    category: 'ai',
    packages: ['@anthropic-ai/sdk', '@ai-sdk/anthropic'],
    description: 'Claude AI model provider',
  },
  {
    name: 'Supabase',
    category: 'database',
    packages: ['@supabase/supabase-js', '@supabase/ssr'],
    description: 'PostgreSQL Database, Auth, and Storage BaaS',
  },
  {
    name: 'Redis',
    category: 'cache',
    packages: ['ioredis', 'redis', '@upstash/redis'],
    description: 'In-memory caching and key-value store',
  },
  {
    name: 'PostgreSQL',
    category: 'database',
    packages: ['pg', '@types/pg'],
    description: 'PostgreSQL relational database driver',
  },
  {
    name: 'AWS SDK',
    category: 'storage',
    packages: ['aws-sdk', '@aws-sdk/client-s3'],
    description: 'Amazon Web Services cloud SDK',
  },
];

export const externalServicesDetector: DetectorInterface = {
  id: 'external-services-detector',
  name: 'External Cloud Services and SDKs Detector',

  async run(context: ScanContext) {
    const { rootPath, builder, packageJsonFiles, tsJsFiles } = context;

    const matchedServices = new Map<string, ServiceSignature>();

    for (const pkgRelPath of packageJsonFiles) {
      const fullPath = path.join(rootPath, pkgRelPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      try {
        const pkg = JSON.parse(content);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        for (const service of KNOWN_SERVICES) {
          for (const pkgName of service.packages) {
            if (deps[pkgName]) {
              matchedServices.set(service.name, service);
            }
          }
        }
      } catch {
        // Handled in workspace detector
      }
    }

    for (const service of matchedServices.values()) {
      const serviceNode = builder.createAndAddNode({
        type: 'external_service',
        key: service.name,
        displayName: service.name,
        metadata: {
          category: service.category,
          description: service.description,
          sdkPackages: service.packages,
        },
        evidence: {
          detectorId: externalServicesDetector.id,
          rule: 'external-sdk-dependency',
          notes: `Detected SDK dependency for ${service.name}`,
        },
        tags: ['external-service', service.category, service.name.toLowerCase()],
      });

      for (const relPath of tsJsFiles) {
        const fullPath = path.join(rootPath, relPath);
        const content = readSafeFile(fullPath);
        if (!content) continue;

        const importsService = service.packages.some(
          pkgName =>
            content.includes(`from '${pkgName}'`) ||
            content.includes(`from "${pkgName}"`) ||
            content.includes(`require('${pkgName}')`) ||
            content.includes(`require("${pkgName}")`)
        );

        if (importsService) {
          const sourceNode =
            builder.getNode(`source_module:${relPath}`) ||
            builder.getNode(`component:${relPath}`) ||
            builder.getNodes().find(n => n.filePath === relPath);

          if (sourceNode) {
            builder.createAndAddEdge({
              source: sourceNode.id,
              target: serviceNode.id,
              type: 'communicates_with',
              evidence: {
                detectorId: externalServicesDetector.id,
                rule: 'imports-external-sdk',
                filePath: relPath,
                codeSnippet: `imports ${service.name} SDK`,
              },
            });
          }
        }
      }
    }
  },
};
