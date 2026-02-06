/**
 * Heartwood Auth Error System
 *
 * Provides structured error codes for authentication failures.
 * Error codes follow the format: HW-AUTH-XXX
 *
 * Categories:
 * - user: User can fix this themselves (try again, use different method)
 * - admin: User should contact admin/support (config issue, permissions)
 * - bug: Internal error (should not happen, needs investigation)
 *
 * @see https://github.com/AutumnsGrove/GroveEngine/issues/668
 */

// =============================================================================
// ERROR CATEGORIES
// =============================================================================

export type ErrorCategory = "user" | "admin" | "bug";

// =============================================================================
// ERROR DEFINITIONS
// =============================================================================

export interface AuthErrorDef {
  /** Heartwood error code (e.g., HW-AUTH-001) */
  code: string;
  /** Error category for determining how to display */
  category: ErrorCategory;
  /** User-facing message (safe to display) */
  userMessage: string;
  /** Admin-facing message with more detail */
  adminMessage: string;
}

/**
 * All Heartwood authentication error codes.
 *
 * Ranges:
 * - 001-019: OAuth provider errors
 * - 020-039: Session/token errors
 * - 040-059: Client configuration errors
 * - 060-079: Rate limiting and security
 * - 080-099: Internal errors
 */
export const AUTH_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // OAuth Provider Errors (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  ACCESS_DENIED: {
    code: "HW-AUTH-001",
    category: "user" as const,
    userMessage: "You cancelled the sign-in process. Try again when ready.",
    adminMessage: "User denied OAuth consent or cancelled the flow.",
  },

  PROVIDER_ERROR: {
    code: "HW-AUTH-002",
    category: "bug" as const,
    userMessage: "The sign-in provider encountered an error. Please try again.",
    adminMessage: "OAuth provider returned an error during authentication.",
  },

  INVALID_SCOPE: {
    code: "HW-AUTH-003",
    category: "admin" as const,
    userMessage:
      "Sign-in failed due to a configuration issue. Contact support.",
    adminMessage: "OAuth scope is invalid or not permitted for this client.",
  },

  REDIRECT_URI_MISMATCH: {
    code: "HW-AUTH-004",
    category: "admin" as const,
    userMessage:
      "Sign-in failed due to a configuration issue. Contact support.",
    adminMessage:
      "The redirect_uri does not match any registered URI for this client.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Session/Token Errors (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  NO_SESSION: {
    code: "HW-AUTH-020",
    category: "user" as const,
    userMessage: "Your session wasn't created. Please try signing in again.",
    adminMessage:
      "No session cookie was set after OAuth callback. May indicate cookie blocking.",
  },

  SESSION_EXPIRED: {
    code: "HW-AUTH-021",
    category: "user" as const,
    userMessage: "Your session has expired. Please sign in again.",
    adminMessage: "Session token has expired or been invalidated.",
  },

  INVALID_TOKEN: {
    code: "HW-AUTH-022",
    category: "user" as const,
    userMessage: "Your session is invalid. Please sign in again.",
    adminMessage: "Token validation failed - token is malformed or revoked.",
  },

  TOKEN_EXCHANGE_FAILED: {
    code: "HW-AUTH-023",
    category: "bug" as const,
    userMessage: "Sign-in failed. Please try again.",
    adminMessage:
      "Failed to exchange authorization code for tokens. Check client credentials.",
  },

  LEGACY_SESSION_EXPIRED: {
    code: "HW-AUTH-024",
    category: "user" as const,
    userMessage:
      "Your old session format has expired. Please sign in with a fresh login.",
    adminMessage:
      "Legacy session cookie found but migration deadline has passed.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Client Configuration Errors (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  UNREGISTERED_CLIENT: {
    code: "HW-AUTH-040",
    category: "admin" as const,
    userMessage:
      "Sign-in failed due to a configuration issue. Contact support.",
    adminMessage:
      "Client ID is not registered with GroveAuth or has been revoked.",
  },

  INVALID_CLIENT: {
    code: "HW-AUTH-041",
    category: "admin" as const,
    userMessage:
      "Sign-in failed due to a configuration issue. Contact support.",
    adminMessage: "Client authentication failed (invalid client_id or secret).",
  },

  ORIGIN_NOT_ALLOWED: {
    code: "HW-AUTH-042",
    category: "admin" as const,
    userMessage:
      "Sign-in failed due to a configuration issue. Contact support.",
    adminMessage:
      "The request origin is not in the allowed origins list for this client.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting and Security (060-079)
  // ─────────────────────────────────────────────────────────────────────────

  RATE_LIMITED: {
    code: "HW-AUTH-060",
    category: "user" as const,
    userMessage:
      "Too many sign-in attempts. Please wait a few minutes and try again.",
    adminMessage: "Rate limit exceeded for authentication endpoint.",
  },

  CSRF_MISMATCH: {
    code: "HW-AUTH-061",
    category: "user" as const,
    userMessage: "Sign-in failed for security reasons. Please try again.",
    adminMessage: "OAuth state parameter mismatch - possible CSRF attack.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal Errors (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "HW-AUTH-080",
    category: "bug" as const,
    userMessage: "An unexpected error occurred. Please try again later.",
    adminMessage: "Internal server error during authentication.",
  },

  UNKNOWN_ERROR: {
    code: "HW-AUTH-099",
    category: "bug" as const,
    userMessage: "An unexpected error occurred. Please try again.",
    adminMessage: "Unknown error code received from OAuth flow.",
  },
} as const satisfies Record<string, AuthErrorDef>;

// Type for error keys
export type AuthErrorKey = keyof typeof AUTH_ERRORS;

// =============================================================================
// ERROR MAPPING
// =============================================================================

/**
 * Map OAuth standard error codes to Heartwood error codes.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
 */
const OAUTH_ERROR_MAP: Record<string, AuthErrorKey> = {
  // OAuth 2.0 standard errors
  access_denied: "ACCESS_DENIED",
  invalid_request: "PROVIDER_ERROR",
  unauthorized_client: "UNREGISTERED_CLIENT",
  invalid_scope: "INVALID_SCOPE",
  server_error: "INTERNAL_ERROR",
  temporarily_unavailable: "INTERNAL_ERROR",

  // Better Auth specific errors
  invalid_client: "INVALID_CLIENT",
  invalid_grant: "TOKEN_EXCHANGE_FAILED",
  redirect_uri_mismatch: "REDIRECT_URI_MISMATCH",

  // Custom/common errors
  no_session: "NO_SESSION",
  session_expired: "SESSION_EXPIRED",
  rate_limited: "RATE_LIMITED",
  csrf_mismatch: "CSRF_MISMATCH",
};

/**
 * Get the Heartwood error definition for an OAuth error code.
 *
 * @param oauthError - The error code from OAuth (e.g., "access_denied")
 * @returns The corresponding AuthErrorDef
 */
export function getAuthError(oauthError: string): AuthErrorDef {
  const key = OAUTH_ERROR_MAP[oauthError.toLowerCase()];
  if (key) {
    return AUTH_ERRORS[key];
  }
  return AUTH_ERRORS.UNKNOWN_ERROR;
}

/**
 * Get error by Heartwood code (e.g., "HW-AUTH-001").
 */
export function getAuthErrorByCode(hwCode: string): AuthErrorDef | undefined {
  return Object.values(AUTH_ERRORS).find((err) => err.code === hwCode);
}

// =============================================================================
// LOGGING HELPERS
// =============================================================================

/**
 * Log an auth error with structured context.
 * Sensitive data (tokens, secrets) is NEVER logged.
 *
 * @param error - The error definition
 * @param context - Additional context (sanitized)
 */
export function logAuthError(
  error: AuthErrorDef,
  context: {
    oauthError?: string;
    ip?: string;
    path?: string;
    userAgent?: string;
  } = {},
): void {
  console.error(
    `[Heartwood Auth] ${error.code}: ${error.adminMessage}`,
    JSON.stringify({
      code: error.code,
      category: error.category,
      ...context,
    }),
  );
}

// =============================================================================
// URL PARAMETER HELPERS
// =============================================================================

/**
 * Build error URL parameters for redirecting to login page.
 * Includes the error code so the login page can display appropriate messaging.
 *
 * @param error - The error definition
 * @param isAdminFlow - Whether this is an admin-facing flow (shows more detail)
 */
export function buildErrorParams(
  error: AuthErrorDef,
  isAdminFlow = false,
): string {
  const params = new URLSearchParams();
  params.set("error", error.userMessage);
  params.set("error_code", error.code);

  // For admin flows, include category for richer UI handling
  if (isAdminFlow) {
    params.set("error_category", error.category);
  }

  return params.toString();
}
