'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { hasClerkKey } from '@/lib/cloud';

// Local-first: Clerk is initialized only when a real publishable key is
// configured. Without it (local dev, CI, static desktop export) children
// render directly with no authentication provider, no network calls, and no
// error overlay. Cloud-only controls read isCloudEnabled() and render a
// clear local-mode state instead.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!hasClerkKey()) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: '#f6c945',
          colorBackground: '#0d0f0c',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
