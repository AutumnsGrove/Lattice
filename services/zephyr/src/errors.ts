/**
 * Zephyr Error System
 *
 * Structured error codes for the Zephyr email gateway and social broadcaster.
 * Follows the Grove error system pattern (GroveErrorDef shape) but lives
 * in-worker since Zephyr is a standalone Cloudflare Worker without the
 * engine as a dependency.
 *
 * Format: ZEPHYR-NNN
 * Ranges:
 *   001-019  Service & configuration errors
 *   020-029  Authentication errors
 *   030-039  Email validation errors
 *   040-049  Broadcast validation errors
 *   050-059  Rate limiting & policy errors
 *   060-069  Provider & delivery errors
 *   070-079  Template errors
 *   080-099  Internal / catch-all errors
 */

// =============================================================================
// TYPE (mirrors GroveErrorDef from @autumnsgrove/lattice/errors)
// =============================================================================

/** Who can fix this error? */
export type ErrorCategory = "user" | "admin" | "bug";

/** Structured error definition — same shape as GroveErrorDef. */
export interface ZephyrErrorDef {
  /** Structured error code (e.g. "ZEPHYR-020") */
  code: string;
  /** Who can fix it: user (retry), admin (config), bug (investigation) */
  category: ErrorCategory;
  /** Safe to show to users — warm, clear, actionable */
  userMessage: string;
  /** Detailed message for server logs and admin dashboards */
  adminMessage: string;
}

// =============================================================================
// ERROR CATALOG
// =============================================================================

export const ZEPHYR_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Service & Configuration Errors (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  DB_UNAVAILABLE: {
    code: "ZEPHYR-001",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "D1 database binding (env.DB) is not available.",
  },

  API_KEY_NOT_CONFIGURED: {
    code: "ZEPHYR-002",
    category: "admin" as const,
    userMessage: "Service is not fully configured. Please contact support.",
    adminMessage:
      "ZEPHYR_API_KEY secret is not set on the worker. Run: wrangler secret put ZEPHYR_API_KEY",
  },

  BLUESKY_NOT_CONFIGURED: {
    code: "ZEPHYR-003",
    category: "admin" as const,
    userMessage:
      "Social posting is not configured yet. Please check your settings.",
    adminMessage:
      "BLUESKY_HANDLE or BLUESKY_APP_PASSWORD secret is not set. Run: wrangler secret put BLUESKY_HANDLE / BLUESKY_APP_PASSWORD",
  },

  RESEND_NOT_CONFIGURED: {
    code: "ZEPHYR-004",
    category: "admin" as const,
    userMessage: "Email sending is not available right now. Please try later.",
    adminMessage:
      "RESEND_API_KEY secret is not set. Run: wrangler secret put RESEND_API_KEY",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication Errors (020-029)
  // ─────────────────────────────────────────────────────────────────────────

  MISSING_API_KEY: {
    code: "ZEPHYR-020",
    category: "user" as const,
    userMessage: "Authentication required. Please include your API key.",
    adminMessage: "Request is missing the X-API-Key header.",
  },

  INVALID_API_KEY_FORMAT: {
    code: "ZEPHYR-021",
    category: "user" as const,
    userMessage: "Your API key doesn't look right. Please check and try again.",
    adminMessage:
      "API key format validation failed (minimum 16 characters required).",
  },

  INVALID_API_KEY: {
    code: "ZEPHYR-022",
    category: "user" as const,
    userMessage: "Invalid API key. Please check your credentials.",
    adminMessage:
      "API key did not match ZEPHYR_API_KEY (timing-safe comparison failed).",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Email Validation Errors (030-039)
  // ─────────────────────────────────────────────────────────────────────────

  INVALID_REQUEST_BODY: {
    code: "ZEPHYR-030",
    category: "user" as const,
    userMessage: "The request couldn't be processed. Please check your input.",
    adminMessage: "Request body is missing or not a valid JSON object.",
  },

  MISSING_REQUIRED_FIELD: {
    code: "ZEPHYR-031",
    category: "user" as const,
    userMessage: "Some required information is missing from your request.",
    adminMessage: "A required field is missing from the email send request.",
  },

  INVALID_EMAIL_TYPE: {
    code: "ZEPHYR-032",
    category: "user" as const,
    userMessage: "The email type isn't recognized. Please check your request.",
    adminMessage:
      "Invalid email type. Must be one of: transactional, notification, verification, sequence, lifecycle, broadcast.",
  },

  INVALID_RECIPIENT: {
    code: "ZEPHYR-033",
    category: "user" as const,
    userMessage: "The email address doesn't look valid. Please double-check.",
    adminMessage: "Recipient email address failed format validation.",
  },

  INVALID_TEMPLATE: {
    code: "ZEPHYR-034",
    category: "user" as const,
    userMessage: "Something's wrong with the email template. Please try again.",
    adminMessage:
      "Template validation failed — raw template requires html/text and subject.",
  },

  INVALID_SCHEDULE: {
    code: "ZEPHYR-035",
    category: "user" as const,
    userMessage: "The scheduled time isn't in the right format.",
    adminMessage: "scheduledAt field is not a valid ISO 8601 timestamp.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Broadcast Validation Errors (040-049)
  // ─────────────────────────────────────────────────────────────────────────

  BROADCAST_CONTENT_REQUIRED: {
    code: "ZEPHYR-040",
    category: "user" as const,
    userMessage: "Your post needs some content before we can send it.",
    adminMessage: "Broadcast content field is missing, not a string, or empty.",
  },

  BROADCAST_CONTENT_TOO_LONG: {
    code: "ZEPHYR-041",
    category: "user" as const,
    userMessage: "Your post is a bit too long. Try shortening it.",
    adminMessage:
      "Broadcast content exceeds maximum allowed length (2000 chars).",
  },

  BROADCAST_INVALID_PLATFORM: {
    code: "ZEPHYR-042",
    category: "user" as const,
    userMessage:
      "One of the selected platforms isn't available. Please check your options.",
    adminMessage:
      "platforms field is invalid — must be a non-empty array of known platforms or 'all'.",
  },

  BROADCAST_DUPLICATE: {
    code: "ZEPHYR-043",
    category: "user" as const,
    userMessage: "This post was already sent! No duplicate created.",
    adminMessage:
      "Idempotency key matched an existing broadcast — returning cached result.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting & Policy Errors (050-059)
  // ─────────────────────────────────────────────────────────────────────────

  RATE_LIMITED: {
    code: "ZEPHYR-050",
    category: "user" as const,
    userMessage: "You're sending too quickly. Please wait a moment.",
    adminMessage: "Rate limit exceeded for tenant/type combination.",
  },

  UNSUBSCRIBED: {
    code: "ZEPHYR-051",
    category: "user" as const,
    userMessage: "This recipient has opted out of emails.",
    adminMessage:
      "Recipient is in the unsubscribe list. Email not sent per policy.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Provider & Delivery Errors (060-069)
  // ─────────────────────────────────────────────────────────────────────────

  PROVIDER_ERROR: {
    code: "ZEPHYR-060",
    category: "bug" as const,
    userMessage: "The delivery service ran into trouble. Please try again.",
    adminMessage: "Upstream provider (Resend/Bluesky) returned an error.",
  },

  CIRCUIT_OPEN: {
    code: "ZEPHYR-061",
    category: "bug" as const,
    userMessage:
      "This service is temporarily paused due to recent issues. It will retry soon.",
    adminMessage:
      "Circuit breaker is open — too many consecutive failures. Will auto-reset after timeout.",
  },

  AUTH_SESSION_FAILED: {
    code: "ZEPHYR-062",
    category: "admin" as const,
    userMessage: "Couldn't connect to the social platform. Please try later.",
    adminMessage:
      "Bluesky session authentication failed. Check BLUESKY_HANDLE and BLUESKY_APP_PASSWORD.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Template Errors (070-079)
  // ─────────────────────────────────────────────────────────────────────────

  TEMPLATE_RENDER_FAILED: {
    code: "ZEPHYR-070",
    category: "bug" as const,
    userMessage: "Something went wrong preparing your email. Please try again.",
    adminMessage: "Template rendering failed. Check template data and format.",
  },

  TEMPLATE_NOT_FOUND: {
    code: "ZEPHYR-071",
    category: "user" as const,
    userMessage: "The requested email template wasn't found.",
    adminMessage:
      "Template name not found in registry. Check available templates at GET /templates.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal Errors (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "ZEPHYR-080",
    category: "bug" as const,
    userMessage: "An unexpected error occurred. Please try again.",
    adminMessage: "Unhandled error in Zephyr worker.",
  },

  IDEMPOTENCY_CHECK_FAILED: {
    code: "ZEPHYR-081",
    category: "bug" as const,
    userMessage: "Something went wrong. Your request is being processed.",
    adminMessage:
      "D1 idempotency check query failed. Proceeding with fail-open.",
  },

  LOG_WRITE_FAILED: {
    code: "ZEPHYR-082",
    category: "bug" as const,
    userMessage: "Your request was processed, but we had trouble logging it.",
    adminMessage: "Failed to write log entry to D1. Check table schema.",
  },
} as const satisfies Record<string, ZephyrErrorDef>;

export type ZephyrErrorKey = keyof typeof ZEPHYR_ERRORS;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log a Zephyr error with structured context.
 * Mirrors logGroveError() from the engine.
 */
export function logZephyrError(
  error: ZephyrErrorDef,
  context: {
    path?: string;
    detail?: string;
    cause?: unknown;
    [key: string]: unknown;
  } = {},
): void {
  const { cause, ...rest } = context;
  const causeMessage =
    cause instanceof Error ? cause.message : cause ? String(cause) : undefined;

  console.error(
    `[Zephyr] ${error.code}: ${error.adminMessage}`,
    JSON.stringify({
      code: error.code,
      category: error.category,
      ...rest,
      ...(causeMessage ? { cause: causeMessage } : {}),
    }),
  );
}

/**
 * Build a JSON error body for Zephyr email responses.
 * Keeps the existing ZephyrResponse shape but populates from the catalog.
 */
export function buildZephyrErrorResponse(error: ZephyrErrorDef): {
  errorCode: string;
  errorMessage: string;
} {
  return {
    errorCode: error.code,
    errorMessage: error.userMessage,
  };
}
