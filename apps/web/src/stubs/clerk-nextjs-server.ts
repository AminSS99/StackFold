import { NextResponse } from 'next/server';

// Static-export (Tauri desktop) stub for `@clerk/nextjs/server`.
// Aliased via next.config only when NEXT_EXPORT=true. All guards pass
// through and all user lookups resolve to signed-out.

export function createRouteMatcher(_patterns?: string[]) {
  return (_req: unknown) => false;
}

export function clerkMiddleware(handler?: (auth: unknown, req: unknown) => unknown) {
  return async (req: unknown) => {
    if (handler) {
      const auth = { protect: async () => {} };
      await handler(auth, req);
    }
    return NextResponse.next();
  };
}

export async function currentUser() {
  return null;
}

export async function auth() {
  return { userId: null };
}
