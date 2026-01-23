/**
 * Shared Utilities
 *
 * Common constants and helpers used across the Clearing Monitor.
 */

/** Component status levels (eliminates magic strings) */
export const ComponentStatus = {
  OPERATIONAL: "operational",
  DEGRADED: "degraded",
  PARTIAL_OUTAGE: "partial_outage",
  MAJOR_OUTAGE: "major_outage",
} as const;
export type ComponentStatus =
  (typeof ComponentStatus)[keyof typeof ComponentStatus];

/** Generate a UUID v4 using the Web Crypto API */
export function generateUUID(): string {
  return crypto.randomUUID();
}
