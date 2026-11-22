// Hosted static demo: pre-scanned fixtures served from /demo-data, no server, no filesystem access.
// Enabled only by the `build:demo` script; desktop and local web builds are unaffected.
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STACKFOLD_DEMO === 'true';
export const IS_DESKTOP_EXPORT = process.env.NEXT_PUBLIC_DESKTOP_EXPORT === 'true';
export const DEMO_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefix a public/ asset path with the deploy base path (a no-op outside the hosted demo). */
export const asset = (publicPath: string): string => `${DEMO_BASE_PATH}${publicPath}`;

/**
 * Returns true when running in a browser hosted on a public/remote domain
 * (such as stack-fold-web.vercel.app) rather than a developer's localhost machine.
 */
export function isRemoteWebHost(): boolean {
  if (IS_STATIC_DEMO) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
}
