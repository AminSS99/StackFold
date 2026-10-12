'use client';

import React from 'react';

// Static-export (Tauri desktop) stub for `@clerk/nextjs`.
// Used only when NEXT_EXPORT=true via next.config aliasing, so the desktop
// bundle contains zero Clerk server-action references. Every export renders
// a local-mode notice instead of cloud authentication UI.

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useUser() {
  return { isSignedIn: false, user: null, isLoaded: true };
}

export function UserButton() {
  return null;
}

export function SignInButton() {
  return null;
}

function LocalModeNotice({ action }: { action: string }) {
  return (
    <div className="rounded-xl border border-[#2a2d24] bg-[#0d0f0c] p-6 text-center">
      <div className="text-sm font-semibold text-[#f6f7f2]">{action} unavailable in this build</div>
      <p className="mt-2 text-xs leading-relaxed text-[#a5aa9b]">
        This desktop build runs local-first with no cloud authentication. Scanning, fixtures,
        graph inspection, Security Lab, and exports remain fully functional.
      </p>
    </div>
  );
}

export function SignIn() {
  return <LocalModeNotice action="Sign in" />;
}

export function SignUp() {
  return <LocalModeNotice action="Sign up" />;
}

export default ClerkProvider;
