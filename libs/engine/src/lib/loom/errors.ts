/**
 * Loom — Error Catalog
 *
 * Structured error codes for the DO framework.
 * Uses the shared GroveErrorDef pattern.
 *
 * Format: GROVE-LOOM-XXX
 * Ranges:
 *   001-019  Infrastructure & initialization
 *   020-039  Routing & request handling
 *   040-049  Storage & persistence
 *   050-059  Alarm scheduling
 *   060-069  WebSocket management
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "../errors/types.js";
import { logGroveError } from "../errors/helpers.js";

// ============================================================================
// Error Catalog
// ============================================================================

export const LOOM_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Infrastructure & Initialization (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  INIT_FAILED: {
    code: "GROVE-LOOM-001",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable. Please try again.",
    adminMessage:
      "DO schema initialization failed during blockConcurrencyWhile.",
  },

  STATE_LOAD_FAILED: {
    code: "GROVE-LOOM-002",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable. Please try again.",
    adminMessage: "Failed to load DO state from storage.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Routing & Request Handling (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  ROUTE_NOT_FOUND: {
    code: "GROVE-LOOM-020",
    category: "user" as const,
    userMessage: "The requested resource was not found.",
    adminMessage: "No route matched the incoming request path and method.",
  },

  INVALID_JSON: {
    code: "GROVE-LOOM-021",
    category: "user" as const,
    userMessage: "The request body could not be parsed.",
    adminMessage: "Request body is not valid JSON.",
  },

  METHOD_NOT_ALLOWED: {
    code: "GROVE-LOOM-022",
    category: "user" as const,
    userMessage: "This action is not supported.",
    adminMessage: "HTTP method not allowed for this route.",
  },

  HANDLER_ERROR: {
    code: "GROVE-LOOM-023",
    category: "bug" as const,
    userMessage: "Something went wrong. Please try again.",
    adminMessage: "Unhandled error in route handler.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Storage & Persistence (040-049)
  // ─────────────────────────────────────────────────────────────────────────

  PERSIST_FAILED: {
    code: "GROVE-LOOM-040",
    category: "bug" as const,
    userMessage: "Changes could not be saved. Please try again.",
    adminMessage: "DO state persistence to SQLite failed.",
  },

  SQL_QUERY_FAILED: {
    code: "GROVE-LOOM-041",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable. Please try again.",
    adminMessage: "SQL query execution failed in DO storage.",
  },

  JSON_PARSE_FAILED: {
    code: "GROVE-LOOM-042",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage: "Failed to parse stored JSON value from DO SQLite.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Alarm Scheduling (050-059)
  // ─────────────────────────────────────────────────────────────────────────

  ALARM_SCHEDULE_FAILED: {
    code: "GROVE-LOOM-050",
    category: "bug" as const,
    userMessage: "Service temporarily unavailable.",
    adminMessage: "Failed to schedule or retrieve alarm in DO.",
  },

  ALARM_HANDLER_ERROR: {
    code: "GROVE-LOOM-051",
    category: "bug" as const,
    userMessage: "A background task encountered an error.",
    adminMessage: "Unhandled error in DO alarm handler.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WebSocket Management (060-069)
  // ─────────────────────────────────────────────────────────────────────────

  WS_ACCEPT_FAILED: {
    code: "GROVE-LOOM-060",
    category: "bug" as const,
    userMessage: "Could not establish a live connection.",
    adminMessage: "WebSocket accept failed in DO.",
  },

  WS_BROADCAST_ERROR: {
    code: "GROVE-LOOM-061",
    category: "bug" as const,
    userMessage: "Live updates may be delayed.",
    adminMessage: "Error broadcasting to one or more WebSocket connections.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal / Catch-All (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  INTERNAL_ERROR: {
    code: "GROVE-LOOM-080",
    category: "bug" as const,
    userMessage: "Something went wrong. Please try again.",
    adminMessage: "Unhandled internal error in Loom DO.",
  },
} as const satisfies Record<string, GroveErrorDef>;

// ============================================================================
// Types
// ============================================================================

export type LoomErrorKey = keyof typeof LOOM_ERRORS;

// ============================================================================
// Logger Helper
// ============================================================================

/**
 * Log a Loom error with structured context.
 * Thin wrapper around the shared logGroveError helper.
 */
export function logLoomError(
  error: GroveErrorDef,
  context: {
    doName?: string;
    doId?: string;
    path?: string;
    method?: string;
    cause?: unknown;
    [key: string]: unknown;
  } = {},
): void {
  logGroveError("Loom", error, context);
}

// ============================================================================
// Response Helpers
// ============================================================================

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/**
 * Convenience helpers for building typed DO responses.
 * Every DO route handler returns a Response — these keep the format consistent.
 */
export const LoomResponse = {
  /** Return a JSON success response. */
  json<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: JSON_HEADERS,
    });
  },

  /** Return a success response with `{ success: true }` plus optional data. */
  success<T extends Record<string, unknown>>(data?: T): Response {
    return LoomResponse.json({ success: true, ...data });
  },

  /** Return a 404 with the ROUTE_NOT_FOUND error. */
  notFound(detail?: string): Response {
    return new Response(
      JSON.stringify({
        error: LOOM_ERRORS.ROUTE_NOT_FOUND.code,
        error_code: LOOM_ERRORS.ROUTE_NOT_FOUND.code,
        error_description: detail ?? LOOM_ERRORS.ROUTE_NOT_FOUND.userMessage,
      }),
      { status: 404, headers: JSON_HEADERS },
    );
  },

  /** Return a 400 with a user-facing message. */
  badRequest(detail: string): Response {
    return new Response(
      JSON.stringify({
        error: LOOM_ERRORS.INVALID_JSON.code,
        error_code: LOOM_ERRORS.INVALID_JSON.code,
        error_description: detail,
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  },

  /** Return a structured error response from a GroveErrorDef. */
  error(groveError: GroveErrorDef, status = 500): Response {
    return new Response(
      JSON.stringify({
        error: groveError.code,
        error_code: groveError.code,
        error_description: groveError.userMessage,
      }),
      { status, headers: JSON_HEADERS },
    );
  },
} as const;
