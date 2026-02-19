/**
 * Utility functions for the Account page components.
 * Extracted for reusability and testability.
 */

/**
 * Format an ISO date string for display.
 * @param isoString - ISO 8601 date string or null/undefined
 * @returns Formatted date string like "January 15, 2026" or "—" if invalid
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    // Check for Invalid Date
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Calculate days remaining until a given date.
 * @param endDateIso - ISO 8601 date string for the end date
 * @returns Number of days remaining, or null if invalid
 */
export function daysRemaining(
  endDateIso: string | null | undefined,
): number | null {
  if (!endDateIso) return null;
  try {
    const end = new Date(endDateIso);
    // Check for Invalid Date
    if (isNaN(end.getTime())) return null;
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? diff : 0;
  } catch {
    return null;
  }
}

/**
 * Patterns that indicate sensitive or unhelpful error information.
 * These should be filtered out and replaced with user-friendly messages.
 */
const SENSITIVE_PATTERNS = [
  // Stripe identifiers
  "stripe_",
  "sk_",
  "pk_",
  "cus_",
  "sub_",
  "pi_",
  "pm_",
  "ch_",
  "in_",
  // Stripe error types
  "api_error",
  "card_error",
  "invalid_request_error",
  "authentication_error",
  "rate_limit_error",
  "idempotency_error",
  // LemonSqueezy
  "lemonsqueezy",
  "lmsqueezy",
  "lemon_",
  // Internal indicators
  "INTERNAL",
  "500",
  "502",
  "503",
  "504",
  // Technical details users shouldn't see
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "fetch failed",
  "network error",
];

/**
 * Sanitize error messages to avoid exposing sensitive provider details.
 * Filters out Stripe/LemonSqueezy-specific error codes and internal error indicators.
 *
 * @param error - The error object to sanitize
 * @param fallback - Fallback message to use if error contains sensitive info
 * @returns Safe error message for display to users
 */
export function sanitizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const msg = error.message;
  const msgLower = msg.toLowerCase();

  // Filter out messages containing sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (msgLower.includes(pattern.toLowerCase())) {
      return fallback;
    }
  }

  return msg || fallback;
}

/**
 * Warning threshold for usage indicators (80%).
 */
export const USAGE_WARNING_THRESHOLD = 80;
