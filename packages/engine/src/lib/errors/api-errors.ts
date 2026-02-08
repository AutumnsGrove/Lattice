/**
 * Engine API Error Catalog
 *
 * Structured error codes for all engine API routes (/api/*).
 * Covers the repeating guard patterns (auth, origin, infra, tenant)
 * and common business logic errors.
 *
 * Format: GROVE-API-XXX
 * Ranges:
 *   001-019  Service bindings, infrastructure
 *   020-039  Auth, session, CSRF, origin
 *   040-059  Business logic, data validation
 *   060-079  Rate limiting, security
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "./types.js";

export const API_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Service & Infrastructure Errors (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  DB_NOT_CONFIGURED: {
    code: "GROVE-API-001",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "D1 database binding (platform.env.DB) is not available.",
  },

  R2_NOT_CONFIGURED: {
    code: "GROVE-API-002",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "R2 bucket binding (platform.env.IMAGES) is not available.",
  },

  DURABLE_OBJECTS_NOT_CONFIGURED: {
    code: "GROVE-API-003",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "Durable Object bindings not configured.",
  },

  PAYMENT_PROVIDER_NOT_CONFIGURED: {
    code: "GROVE-API-004",
    category: "bug" as const,
    userMessage: "Payment service is temporarily unavailable.",
    adminMessage: "Payment provider (LemonSqueezy/Stripe) not configured.",
  },

  AI_SERVICE_NOT_CONFIGURED: {
    code: "GROVE-API-005",
    category: "bug" as const,
    userMessage:
      "This feature isn't available right now. Please try again later.",
    adminMessage: "AI service binding or API key not configured.",
  },

  WEBHOOK_SECRET_NOT_CONFIGURED: {
    code: "GROVE-API-006",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage: "Webhook secret not configured.",
  },

  KEK_NOT_CONFIGURED: {
    code: "GROVE-API-007",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage: "GROVE_KEK secret not configured for envelope encryption.",
  },

  TURNSTILE_NOT_CONFIGURED: {
    code: "GROVE-API-008",
    category: "bug" as const,
    userMessage: "Verification service temporarily unavailable.",
    adminMessage: "Turnstile secret key not configured.",
  },

  GITHUB_TOKEN_NOT_CONFIGURED: {
    code: "GROVE-API-009",
    category: "bug" as const,
    userMessage: "This feature isn't available right now.",
    adminMessage: "GITHUB_TOKEN not configured for GitHub API access.",
  },

  SERVICE_UNAVAILABLE: {
    code: "GROVE-API-010",
    category: "bug" as const,
    userMessage:
      "Service temporarily unavailable. Please try again in a moment.",
    adminMessage: "Required service binding or configuration is unavailable.",
  },

  UPLOAD_SERVICE_UNAVAILABLE: {
    code: "GROVE-API-011",
    category: "bug" as const,
    userMessage: "Upload service is temporarily unavailable. Please try again.",
    adminMessage: "R2 upload service unavailable (binding or config issue).",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Auth, Session, CSRF, Origin (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  UNAUTHORIZED: {
    code: "GROVE-API-020",
    category: "user" as const,
    userMessage: "Please sign in to continue.",
    adminMessage: "Request has no authenticated user (locals.user is null).",
  },

  INVALID_ORIGIN: {
    code: "GROVE-API-021",
    category: "user" as const,
    userMessage: "Request failed for security reasons. Please try again.",
    adminMessage:
      "CSRF origin validation failed. Origin header doesn't match expected host.",
  },

  INVALID_CSRF_TOKEN: {
    code: "GROVE-API-022",
    category: "user" as const,
    userMessage:
      "Request failed for security reasons. Please refresh the page and try again.",
    adminMessage: "CSRF token validation failed. Token missing or mismatched.",
  },

  TENANT_CONTEXT_REQUIRED: {
    code: "GROVE-API-023",
    category: "bug" as const,
    userMessage: "Something went wrong loading this page. Please try again.",
    adminMessage:
      "Tenant context (locals.tenantId or context.tenant) is missing.",
  },

  ADMIN_ACCESS_REQUIRED: {
    code: "GROVE-API-024",
    category: "user" as const,
    userMessage: "You don't have permission to access this.",
    adminMessage: "Admin-only endpoint accessed by non-admin user.",
  },

  FORBIDDEN: {
    code: "GROVE-API-028",
    category: "user" as const,
    userMessage: "You don't have permission to perform this action.",
    adminMessage:
      "Tenant isolation violation — user attempted to access a resource belonging to another tenant.",
  },

  SESSION_EXPIRED: {
    code: "GROVE-API-025",
    category: "user" as const,
    userMessage: "Your session has expired. Please sign in again.",
    adminMessage: "Session token expired or was invalidated.",
  },

  SUBSCRIPTION_REQUIRED: {
    code: "GROVE-API-026",
    category: "user" as const,
    userMessage: "This feature requires an active subscription.",
    adminMessage: "User lacks active subscription for gated feature.",
  },

  HUMAN_VERIFICATION_FAILED: {
    code: "GROVE-API-027",
    category: "user" as const,
    userMessage: "Verification failed. Please try again.",
    adminMessage: "Turnstile human verification challenge failed.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Business Logic & Validation (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  INVALID_REQUEST_BODY: {
    code: "GROVE-API-040",
    category: "user" as const,
    userMessage: "The request couldn't be processed. Please try again.",
    adminMessage: "Request body is missing, malformed, or not valid JSON.",
  },

  MISSING_REQUIRED_FIELDS: {
    code: "GROVE-API-041",
    category: "user" as const,
    userMessage:
      "Some required fields are missing. Please fill them in and try again.",
    adminMessage: "One or more required fields missing from request body.",
  },

  VALIDATION_FAILED: {
    code: "GROVE-API-042",
    category: "user" as const,
    userMessage:
      "Some of the information provided isn't quite right. Please check and try again.",
    adminMessage:
      "Input validation failed (format, length, or value constraint).",
  },

  RESOURCE_NOT_FOUND: {
    code: "GROVE-API-043",
    category: "user" as const,
    userMessage:
      "The item you're looking for doesn't exist or has been removed.",
    adminMessage: "Requested resource not found in database.",
  },

  SLUG_CONFLICT: {
    code: "GROVE-API-044",
    category: "user" as const,
    userMessage:
      "That URL path is already in use. Please choose a different one.",
    adminMessage: "Slug already exists (unique constraint violation).",
  },

  CONTENT_TOO_LARGE: {
    code: "GROVE-API-045",
    category: "user" as const,
    userMessage:
      "The content is too large. Please reduce the size and try again.",
    adminMessage: "Content exceeds maximum allowed size.",
  },

  INVALID_FILE: {
    code: "GROVE-API-046",
    category: "user" as const,
    userMessage:
      "This file type isn't supported or the file appears to be corrupted.",
    adminMessage:
      "File validation failed (type, extension, signature, or dimensions).",
  },

  FEATURE_DISABLED: {
    code: "GROVE-API-047",
    category: "user" as const,
    userMessage: "This feature isn't enabled for your site yet.",
    adminMessage: "Feature is disabled for this tenant (curio, shop, etc.).",
  },

  EXPORT_TOO_LARGE: {
    code: "GROVE-API-048",
    category: "user" as const,
    userMessage: "Your export is too large. Please contact support for help.",
    adminMessage:
      "Export exceeds maximum size limits (posts, media, or pages count).",
  },

  INVALID_STATE_TRANSITION: {
    code: "GROVE-API-049",
    category: "user" as const,
    userMessage: "This action can't be performed right now.",
    adminMessage: "Invalid state transition (e.g., cancel a non-running test).",
  },

  COMMENTS_DISABLED: {
    code: "GROVE-API-050",
    category: "user" as const,
    userMessage: "Comments are closed on this post.",
    adminMessage:
      "Comment submission attempted on post with comments disabled.",
  },

  COMMENT_NOT_FOUND: {
    code: "GROVE-API-051",
    category: "user" as const,
    userMessage:
      "That comment doesn't exist or has already been removed.",
    adminMessage: "Comment ID not found in database.",
  },

  COMMENT_EDIT_WINDOW_CLOSED: {
    code: "GROVE-API-052",
    category: "user" as const,
    userMessage:
      "The edit window has closed. Comments can only be edited within 15 minutes.",
    adminMessage:
      "Comment edit attempted after 15-minute edit window expired.",
  },

  COMMENT_BLOCKED: {
    code: "GROVE-API-053",
    category: "user" as const,
    userMessage:
      "You're unable to comment on this blog.",
    adminMessage:
      "Blocked user attempted to submit comment on tenant.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting & Security (060-079)
  // ─────────────────────────────────────────────────────────────────────────

  RATE_LIMITED: {
    code: "GROVE-API-060",
    category: "user" as const,
    userMessage:
      "You're moving faster than we can keep up! Please wait a moment.",
    adminMessage: "Rate limit exceeded for this endpoint.",
  },

  USAGE_LIMIT_REACHED: {
    code: "GROVE-API-061",
    category: "user" as const,
    userMessage:
      "You've reached your usage limit. It resets at the start of the month.",
    adminMessage:
      "Monthly or daily usage cap reached (AI, transcription, etc.).",
  },

  UPLOAD_RESTRICTED: {
    code: "GROVE-API-062",
    category: "user" as const,
    userMessage: "Upload access has been temporarily restricted.",
    adminMessage: "Upload abuse throttle triggered for this tenant.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal / Catch-All (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "GROVE-API-080",
    category: "bug" as const,
    userMessage: "Something went wrong. Please try again.",
    adminMessage: "Unhandled error in API route handler.",
  },

  OPERATION_FAILED: {
    code: "GROVE-API-081",
    category: "bug" as const,
    userMessage: "The operation didn't complete. Please try again.",
    adminMessage: "Database or service operation failed in catch block.",
  },

  UPSTREAM_ERROR: {
    code: "GROVE-API-082",
    category: "bug" as const,
    userMessage:
      "An external service isn't responding. Please try again later.",
    adminMessage:
      "Upstream service (GitHub, AI, payment) returned an error or timed out.",
  },

  AI_TIMEOUT: {
    code: "GROVE-API-083",
    category: "user" as const,
    userMessage: "The analysis took too long. Please try again.",
    adminMessage: "AI service request timed out.",
  },
} as const satisfies Record<string, GroveErrorDef>;

export type ApiErrorKey = keyof typeof API_ERRORS;
