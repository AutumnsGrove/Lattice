/**
 * Wayfinder Identity Configuration (Heartwood mirror)
 *
 * KEEP IN SYNC with the canonical source at:
 * packages/engine/src/lib/config/wayfinder.ts
 *
 * Heartwood is a standalone Cloudflare Worker and cannot import
 * from the engine package directly.
 */

/** All email addresses belonging to the Wayfinder */
export const WAYFINDER_EMAILS = [
  "autumn@grove.place",
  "autumnbrown23@pm.me",
] as const;

/**
 * Check if an email belongs to the Wayfinder.
 * Handles null/undefined and case normalization internally.
 */
export function isWayfinder(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return WAYFINDER_EMAILS.some((e) => e === normalized);
}
