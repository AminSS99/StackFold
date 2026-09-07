import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.POSTHOG_API_KEY;
  return NextResponse.json({
    analyticsConfigured: !!apiKey,
    status: 'ok',
  });
}
