import { NextResponse } from 'next/server';
import path from 'node:path';

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
      id: 'stackfold-self',
      name: 'Stackfold Monorepo (Self Scan)',
      description: 'The Stackfold visual project intelligence codebase itself',
      path: path.resolve(process.cwd(), '../../'),
      frameworks: ['Next.js', 'TypeScript', 'pnpm workspaces', 'React Flow', 'Zustand'],
    },
  ];

  return NextResponse.json({ fixtures });
}
