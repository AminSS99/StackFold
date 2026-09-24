import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isPublicRoute = createRouteMatcher([
  '/',
  '/download',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/share(.*)',
  '/api/fixtures',
  '/api/scan',
  '/api/validate-path',
  '/api/cache',
]);

export default function middleware(req: NextRequest) {
  // If Clerk keys are not configured or in static desktop export mode, bypass auth check
  if (!hasClerk || process.env.NEXT_EXPORT === 'true') {
    return NextResponse.next();
  }

  return clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  })(req, {} as any);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
