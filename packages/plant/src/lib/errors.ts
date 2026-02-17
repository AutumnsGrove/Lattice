/**
 * Plant Onboarding Error System
 *
 * Structured error codes for the Plant onboarding flow.
 * Uses the shared GroveErrorDef type from the Grove error system.
 *
 * Format: PLANT-XXX
 * Ranges:
 *   001-019  Service & binding errors
 *   020-039  Session & auth errors
 *   040-059  Database & onboarding errors
 *   080-099  Internal / catch-all errors
 */

import type {
  ErrorCategory as _ErrorCategory,
  GroveErrorDef,
} from "@autumnsgrove/lattice/errors";
import { logGroveError, buildErrorUrl } from "@autumnsgrove/lattice/errors";

// =============================================================================
// BACKWARD-COMPATIBLE TYPE ALIASES
// =============================================================================

export type ErrorCategory = _ErrorCategory;

/** @deprecated Use GroveErrorDef from '@autumnsgrove/lattice/errors' */
export type PlantErrorDef = GroveErrorDef;

// =============================================================================
// ERROR DEFINITIONS
// =============================================================================

export const PLANT_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Service & Binding Errors (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  DB_UNAVAILABLE: {
    code: "PLANT-001",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage:
      "D1 database binding (platform.env.DB) is not available. Configure in Cloudflare Dashboard > Pages > grove-plant > Settings > Database bindings. See https://developers.cloudflare.com/pages/platform/functions/#databases",
  },

  AUTH_BINDING_MISSING: {
    code: "PLANT-002",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "AUTH service binding (platform.env.AUTH) is not available.",
  },

  STRIPE_NOT_CONFIGURED: {
    code: "PLANT-003",
    category: "bug" as const,
    userMessage:
      "Payment system is being set up. Please try again in a moment.",
    adminMessage:
      "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Cloudflare Dashboard > Pages > grove-plant > Settings > Environment variables. See https://docs.stripe.com/keys#api-keys",
  },

  KV_BINDING_MISSING: {
    code: "PLANT-004",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage:
      "KV binding (platform.env.KV) is not available. Configure in Cloudflare Dashboard > Pages > grove-plant > Settings > KV namespace bindings.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Session & Auth Errors (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  SESSION_FETCH_FAILED: {
    code: "PLANT-020",
    category: "user" as const,
    userMessage: "We couldn't verify your sign-in. Please try again.",
    adminMessage: "GET /api/auth/get-session returned non-200 status.",
  },

  NO_SESSION_DATA: {
    code: "PLANT-021",
    category: "user" as const,
    userMessage: "Your sign-in session wasn't found. Please try again.",
    adminMessage:
      "get-session returned 200 but response has no session or user data.",
  },

  MAGIC_LINK_ERROR: {
    code: "PLANT-022",
    category: "user" as const,
    userMessage: "Your magic link didn't work. Please request a new one.",
    adminMessage:
      "Magic link callback received an error parameter from Heartwood.",
  },

  OAUTH_ACCESS_DENIED: {
    code: "PLANT-023",
    category: "user" as const,
    userMessage: "You cancelled the sign-in. Try again when you're ready.",
    adminMessage: "User denied OAuth consent or cancelled the sign-in flow.",
  },

  OAUTH_PROVIDER_ERROR: {
    code: "PLANT-024",
    category: "bug" as const,
    userMessage: "The sign-in provider ran into trouble. Please try again.",
    adminMessage: "OAuth provider returned an error during authentication.",
  },

  NO_SESSION_COOKIE: {
    code: "PLANT-025",
    category: "user" as const,
    userMessage: "Your session wasn't created. Please try signing in again.",
    adminMessage:
      "No Better Auth session cookie found after OAuth callback. May indicate cookie blocking or cross-site restrictions.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Database & Onboarding Errors (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  ONBOARDING_QUERY_FAILED: {
    code: "PLANT-040",
    category: "bug" as const,
    userMessage:
      "Something went wrong setting up your account. Please try again.",
    adminMessage:
      "SELECT from user_onboarding failed. Table may not exist or query error.",
  },

  ONBOARDING_INSERT_FAILED: {
    code: "PLANT-041",
    category: "bug" as const,
    userMessage:
      "Something went wrong creating your account. Please try again.",
    adminMessage:
      "INSERT into user_onboarding failed. Possible constraint violation or missing column.",
  },

  ONBOARDING_UPDATE_FAILED: {
    code: "PLANT-042",
    category: "bug" as const,
    userMessage:
      "Something went wrong updating your account. Please try again.",
    adminMessage: "UPDATE user_onboarding failed.",
  },

  TENANT_QUERY_FAILED: {
    code: "PLANT-043",
    category: "bug" as const,
    userMessage: "Something went wrong finding your blog. Please try again.",
    adminMessage: "SELECT from tenants table failed.",
  },

  COOKIE_ERROR: {
    code: "PLANT-044",
    category: "bug" as const,
    userMessage: "We had trouble saving your session. Please try again.",
    adminMessage: "Failed to set cookies (onboarding_id or access_token).",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal Errors (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "PLANT-080",
    category: "bug" as const,
    userMessage: "An unexpected error occurred. Please try again.",
    adminMessage: "Unhandled error in Plant callback handler.",
  },
} as const satisfies Record<string, PlantErrorDef>;

export type PlantErrorKey = keyof typeof PLANT_ERRORS;

// =============================================================================
// HELPERS (thin wrappers around shared Grove error helpers)
// =============================================================================

/**
 * Log a Plant error with structured context.
 * Thin wrapper around the shared logGroveError helper.
 */
export function logPlantError(
  error: PlantErrorDef,
  context: {
    path?: string;
    userId?: string;
    detail?: string;
    cause?: unknown;
  } = {},
): void {
  logGroveError("Plant", error, context);
}

/**
 * Build a redirect URL with structured error params.
 * Thin wrapper around the shared buildErrorUrl helper.
 *
 * The resulting URL includes:
 * - `error`      — safe user-facing message
 * - `error_code` — structured code for debugging (e.g. PLANT-040)
 */
export function buildPlantErrorUrl(
  error: PlantErrorDef,
  baseUrl = "/",
  extra?: Record<string, string>,
): string {
  return buildErrorUrl(error, baseUrl, extra);
}
