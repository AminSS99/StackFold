// Cloud availability is strictly opt-in: both the Clerk publishable key and a
// database URL must be configured. Otherwise Stackfold runs local-first with
// scanning, fixtures, graph inspection, Security Lab, and exports fully
// functional and cloud controls hidden behind a clear local-mode state.
export function isCloudEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.NEXT_EXPORT === 'true') return false;
  if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
    return false;
  }
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function hasClerkKey(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
