/**
 * Auth URL Configuration — Single Source of Truth
 *
 * ALL auth URLs across the monorepo MUST import from here.
 * No package should define its own DEFAULT_AUTH_URL or AUTH_API_URL.
 *
 * The canonical auth entry point is login.grove.place, which proxies
 * all requests to Heartwood via Cloudflare service binding (Worker-to-Worker).
 * This ensures all auth traffic flows through the hardened proxy with
 * cookie filtering, header allowlisting, and body size limits.
 */

/** The canonical auth hub URL. Used for browser flows, service binding
 *  calls (hostname is cosmetic for CF service bindings), and public API fallbacks. */
export const AUTH_HUB_URL = "https://login.grove.place";

/** Build an auth hub path. Works for both service binding (cosmetic host) and public fetch. */
export function authPath(path: string): string {
  return `${AUTH_HUB_URL}${path}`;
}
