import { NextResponse } from 'next/server';
import { PUBLIC_FIXTURES } from '@/lib/server-security';

export const dynamic = 'force-static';

export async function GET() {
  const fixtures = Object.entries(PUBLIC_FIXTURES).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    path: `fixtures/${id}`,
    frameworks: meta.frameworks,
  }));

  return NextResponse.json({ fixtures });
}
