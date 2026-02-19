/**
 * Threshold — Error Catalog
 *
 * Structured error codes for rate limiting across all Grove packages.
 * Uses the shared GroveErrorDef pattern for consistency with API, Auth,
 * and other error catalogs.
 *
 * Format: GROVE-THRESHOLD-XXX
 * Ranges:
 *   001-019  Storage & infrastructure
 *   020-039  Rate limiting responses
 *   040-059  Abuse & ban enforcement
 *   060-079  Configuration & usage
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "../errors/types.js";
import { logGroveError } from "../errors/helpers.js";

// ============================================================================
// Error Catalog
// ============================================================================

export const THRESHOLD_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Storage & Infrastructure (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  KV_UNAVAILABLE: {
    code: "GROVE-THRESHOLD-001",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "KV storage binding unavailable for rate limit check.",
  },

  D1_UNAVAILABLE: {
    code: "GROVE-THRESHOLD-002",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "D1 database unavailable for rate limit check.",
  },

  STORAGE_READ_FAILED: {
    code: "GROVE-THRESHOLD-003",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "Rate limit storage read operation failed (get/query).",
  },

  STORAGE_WRITE_FAILED: {
    code: "GROVE-THRESHOLD-004",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "Rate limit storage write operation failed (put/insert).",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting Responses (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  RATE_LIMITED: {
    code: "GROVE-THRESHOLD-020",
    category: "user" as const,
    userMessage:
      "You're moving faster than we can keep up! Take a moment and try again soon.",
    adminMessage: "Rate limit exceeded for endpoint.",
  },

  RATE_LIMITED_AUTH: {
    code: "GROVE-THRESHOLD-021",
    category: "user" as const,
    userMessage:
      "Too many sign-in attempts. Please wait a few minutes and try again.",
    adminMessage:
      "Rate limit exceeded for authentication endpoint (fail-closed).",
  },

  RATE_LIMITED_UPLOAD: {
    code: "GROVE-THRESHOLD-022",
    category: "user" as const,
    userMessage:
      "You've uploaded a lot recently. Please wait a bit before uploading more.",
    adminMessage: "Upload rate limit exceeded for tenant.",
  },

  RATE_LIMITED_AI: {
    code: "GROVE-THRESHOLD-023",
    category: "user" as const,
    userMessage:
      "You've reached your AI usage limit for today. It resets at midnight UTC.",
    adminMessage: "AI endpoint rate limit exceeded for tenant.",
  },

  RATE_LIMITED_TENANT: {
    code: "GROVE-THRESHOLD-024",
    category: "user" as const,
    userMessage:
      "Your site is seeing a lot of traffic! Some requests may be slower than usual.",
    adminMessage: "Tenant-level rate limit exceeded for subscription tier.",
  },

  SERVICE_UNAVAILABLE: {
    code: "GROVE-THRESHOLD-030",
    category: "bug" as const,
    userMessage:
      "Unable to process your request right now. Please try again in a moment.",
    adminMessage:
      "Rate limit check failed with failMode=closed, returning 503.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Abuse & Ban Enforcement (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  ABUSE_WARNING: {
    code: "GROVE-THRESHOLD-040",
    category: "user" as const,
    userMessage:
      "You've been hitting rate limits frequently. Continued violations may result in a temporary ban.",
    adminMessage:
      "Abuse warning issued — user has 1-4 rate limit violations within decay window.",
  },

  ABUSE_BANNED: {
    code: "GROVE-THRESHOLD-041",
    category: "user" as const,
    userMessage:
      "Your access has been temporarily restricted due to repeated rate limit violations. Please try again later.",
    adminMessage:
      "User banned for 24 hours — 5+ rate limit violations within decay window.",
  },

  ABUSE_STATE_ERROR: {
    code: "GROVE-THRESHOLD-042",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable. Please try again.",
    adminMessage: "Failed to read or write abuse tracking state in KV.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Configuration & Usage (060-079)
  // ─────────────────────────────────────────────────────────────────────────

  UNKNOWN_ENDPOINT: {
    code: "GROVE-THRESHOLD-060",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage:
      "Endpoint not found in ENDPOINT_MAP — using default rate limits.",
  },

  INVALID_TIER: {
    code: "GROVE-THRESHOLD-061",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage:
      "Invalid subscription tier passed to checkTier or checkTenant.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal / Catch-All (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "GROVE-THRESHOLD-080",
    category: "bug" as const,
    userMessage: "Something went wrong. Please try again.",
    adminMessage: "Unhandled error in Threshold rate limit check.",
  },
} as const satisfies Record<string, GroveErrorDef>;

// ============================================================================
// Types
// ============================================================================

export type ThresholdErrorKey = keyof typeof THRESHOLD_ERRORS;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Log a Threshold error with structured context.
 * Thin wrapper around the shared logGroveError helper.
 */
export function logThresholdError(
  error: GroveErrorDef,
  context: {
    key?: string;
    store?: string;
    failMode?: string;
    endpoint?: string;
    tier?: string;
    userId?: string;
  } = {},
): void {
  logGroveError("Threshold", error, context);
}
