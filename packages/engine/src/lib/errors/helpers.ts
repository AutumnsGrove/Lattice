/**
 * Grove Error System — Shared Helpers
 *
 * Logging, URL building, JSON formatting, and SvelteKit error throwing.
 * Used by all Grove packages for consistent error handling.
 *
 * @example
 * ```typescript
 * import { logGroveError, buildErrorUrl, throwGroveError } from '@autumnsgrove/lattice/errors';
 *
 * // Log with structured context
 * logGroveError('Landing', ERRORS.DB_DOWN, { path: '/blog', cause: err });
 *
 * // Build a redirect URL
 * const url = buildErrorUrl(ERRORS.SESSION_EXPIRED, '/login');
 *
 * // Throw a SvelteKit error with code attached
 * throwGroveError(500, ERRORS.DB_DOWN, 'Engine', { path: url.pathname });
 * ```
 */

import { error } from "@sveltejs/kit";
import type { GroveErrorDef } from "./types.js";

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Log a Grove error with structured context.
 * Sensitive data (tokens, secrets, passwords) is NEVER included.
 *
 * @param prefix - Package or module name (e.g. "Landing", "Plant", "Heartwood Auth")
 * @param groveError - The error definition from the package catalog
 * @param context - Additional context for debugging (sanitized automatically)
 */
export function logGroveError(
  prefix: string,
  groveError: GroveErrorDef,
  context: {
    path?: string;
    userId?: string;
    detail?: string;
    cause?: unknown;
    [key: string]: unknown;
  } = {},
): void {
  // Extract a safe message from the cause — never log full error objects
  const { cause, ...rest } = context;
  const causeMessage =
    cause instanceof Error ? cause.message : cause ? String(cause) : undefined;

  console.error(
    `[${prefix}] ${groveError.code}: ${groveError.adminMessage}`,
    JSON.stringify({
      code: groveError.code,
      category: groveError.category,
      ...rest,
      ...(causeMessage ? { cause: causeMessage } : {}),
    }),
  );
}

// =============================================================================
// URL BUILDING (for redirect-based error display)
// =============================================================================

/**
 * Build a redirect URL with structured error params.
 *
 * The resulting URL includes:
 * - `error`      — safe user-facing message
 * - `error_code` — structured code for debugging (e.g. PLANT-040)
 *
 * @param groveError - The error definition
 * @param baseUrl - Base path to redirect to (default: "/")
 * @param extra - Additional query params to include
 */
export function buildErrorUrl(
  groveError: GroveErrorDef,
  baseUrl = "/",
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  params.set("error", groveError.userMessage);
  params.set("error_code", groveError.code);

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }

  return `${baseUrl}?${params.toString()}`;
}

// =============================================================================
// JSON BUILDING (for API responses)
// =============================================================================

/**
 * Build a JSON error response body.
 * Compatible with Heartwood's existing `{ error, error_code, error_description }` format.
 *
 * @param groveError - The error definition
 */
export function buildErrorJson(groveError: GroveErrorDef): {
  error: string;
  error_code: string;
  error_description: string;
} {
  return {
    error: groveError.code,
    error_code: groveError.code,
    error_description: groveError.userMessage,
  };
}

// =============================================================================
// SVELTEKIT ERROR THROWING
// =============================================================================

/**
 * Log a structured error and throw a SvelteKit error with the code attached.
 *
 * The thrown error includes `{ message, code, category }` which `+error.svelte`
 * can render with the error code in monospace.
 *
 * **Important:** This uses SvelteKit's `error()` helper, so it must NOT be used
 * in Hono-based packages (Heartwood). Use `buildErrorJson()` there instead.
 *
 * @param status - HTTP status code
 * @param groveError - The error definition from the package catalog
 * @param prefix - Package name for log prefix
 * @param context - Additional context for the log entry
 */
export function throwGroveError(
  status: number,
  groveError: GroveErrorDef,
  prefix: string,
  context: {
    path?: string;
    userId?: string;
    detail?: string;
    cause?: unknown;
    [key: string]: unknown;
  } = {},
): never {
  logGroveError(prefix, groveError, context);

  throw error(status, {
    message: groveError.userMessage,
    code: groveError.code,
    category: groveError.category,
  });
}
