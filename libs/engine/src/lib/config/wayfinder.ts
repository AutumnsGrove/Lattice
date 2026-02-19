/**
 * Wayfinder Identity Configuration
 *
 * The Wayfinder is the platform owner (Autumn). This is the single source
 * of truth for Wayfinder email addresses — used for admin access checks
 * across all Grove packages.
 *
 * Previously duplicated in 18 files as WAYFINDER_EMAILS and ADMIN_EMAILS.
 * Now centralized here. Heartwood maintains a synced mirror at
 * packages/heartwood/src/config/wayfinder.ts (standalone worker boundary).
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
