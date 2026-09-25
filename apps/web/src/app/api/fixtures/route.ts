import { NextResponse } from 'next/server';
import path from 'node:path';

export const dynamic = 'force-static';

export async function GET() {
  const fixtures = [
    {
      id: 'sample-ecommerce-app',
      name: 'Sample E-Commerce Store',
      description: 'Next.js 14 App Router + Prisma + PostgreSQL + Stripe + Resend + Tailwind',
      path: path.resolve(process.cwd(), '../../fixtures/sample-ecommerce-app'),
      frameworks: ['Next.js', 'Prisma', 'Stripe', 'Resend', 'Tailwind CSS'],
    },
    {
      id: 'sample-monorepo-platform',
      name: 'Multi-Package Monorepo Platform',
      description: 'pnpm Workspaces monorepo with 2 Next.js apps, shared Prisma DB, and utilities',
      path: path.resolve(process.cwd(), '../../fixtures/sample-monorepo-platform'),
      frameworks: ['Next.js', 'Prisma', 'pnpm workspaces', 'Stripe'],
    },
    {
      id: 'preview-fence-vercel-supabase',
      name: 'PreviewFence Environment Risk',
      description: 'Vercel preview environment sharing a production Supabase project',
      path: path.resolve(process.cwd(), '../../fixtures/preview-fence-vercel-supabase'),
      frameworks: ['Vercel', 'Supabase', 'PreviewFence'],
    },
    {
      id: 'tx-escape-prisma',
      name: 'TxEscape Transaction Risk',
      description: 'Prisma transaction calling an imported Resend email helper',
      path: path.resolve(process.cwd(), '../../fixtures/tx-escape-prisma'),
      frameworks: ['Prisma', 'Resend', 'TxEscape'],
    },
    {
      id: 'scopepatch-idtrace',
      name: 'ScopePatch and IDTrace Guardrails',
      description: 'GitHub App REST permission correlation and explicit typed identity boundaries',
      path: path.resolve(process.cwd(), '../../fixtures/scopepatch-idtrace'),
      frameworks: ['GitHub App', 'Octokit', 'ScopePatch', 'IDTrace'],
    },
    {
      id: 'cache-isolation-vulnerable',
      name: 'Cache Isolation Security Lab',
      description: 'Two authenticated Playwright sessions exposing a shared HTML cache leak',
      path: path.resolve(process.cwd(), '../../fixtures/cache-isolation-vulnerable'),
      frameworks: ['Playwright', 'Cache Isolation', 'Security Lab'],
    },
    {
      id: 'signature-compatibility-vulnerable',
      name: 'Signature Compatibility Mismatch',
      description: 'Signer and verifier disagree on eight normalization dimensions with byte-exact evidence',
      path: path.resolve(process.cwd(), '../../fixtures/signature-compatibility-vulnerable'),
      frameworks: ['HMAC-SHA256', 'Signature Compatibility', 'Security Lab'],
    },
    {
      id: 'signature-compatibility-passing',
      name: 'Signature Compatibility Passing',
      description: 'Signer and verifier share one canonicalization across all eight test vectors',
      path: path.resolve(process.cwd(), '../../fixtures/signature-compatibility-passing'),
      frameworks: ['HMAC-SHA256', 'Signature Compatibility', 'Security Lab'],
    },
    {
      id: 'queue-compatibility-failing',
      name: 'Queue Compatibility Historical Mismatch',
      description: 'Historical BullMQ v1 payloads replayed against a v2 worker contract with field-exact evidence',
      path: path.resolve(process.cwd(), '../../fixtures/queue-compatibility-failing'),
      frameworks: ['BullMQ', 'Queue Compatibility', 'Security Lab'],
    },
    {
      id: 'queue-compatibility-passing',
      name: 'Queue Compatibility Passing',
      description: 'Historical BullMQ payloads that all satisfy the current worker contract',
      path: path.resolve(process.cwd(), '../../fixtures/queue-compatibility-passing'),
      frameworks: ['BullMQ', 'Queue Compatibility', 'Security Lab'],
    },
    {
      id: 'stackfold-self',
      name: 'Stackfold Monorepo (Self Scan)',
      description: 'The Stackfold visual project intelligence codebase itself',
      path: path.resolve(process.cwd(), '../../'),
      frameworks: ['Next.js', 'TypeScript', 'pnpm workspaces', 'React Flow', 'Zustand'],
    },
  ];

  return NextResponse.json({ fixtures });
}
