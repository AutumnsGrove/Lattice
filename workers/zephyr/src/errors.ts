/**
 * Zephyr Error Utilities
 *
 * Helper functions for creating structured error responses.
 */

import type { ZephyrError, ZephyrErrorCode } from "./types";

/**
 * Create a Zephyr error object.
 */
export function createError(
  code: ZephyrErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ZephyrError {
  return {
    code,
    message,
    retryable: isRetryable(code),
    details,
  };
}

/**
 * Check if an error code is retryable.
 */
export function isRetryable(code: ZephyrErrorCode): boolean {
  return (
    code === "PROVIDER_ERROR" ||
    code === "CIRCUIT_OPEN" ||
    code === "NETWORK_ERROR"
  );
}

/**
 * Create an invalid request error.
 */
export function invalidRequest(message: string, field?: string): ZephyrError {
  return createError("INVALID_REQUEST", message, field ? { field } : undefined);
}

/**
 * Create an invalid template error.
 */
export function invalidTemplate(template: string): ZephyrError {
  return createError("INVALID_TEMPLATE", `Unknown template: ${template}`, {
    template,
  });
}

/**
 * Create an invalid recipient error.
 */
export function invalidRecipient(
  email: string,
  reason: "malformed" | "blocklisted",
): ZephyrError {
  return createError(
    "INVALID_RECIPIENT",
    reason === "malformed"
      ? `Invalid email format: ${email}`
      : `Email is blocklisted: ${email}`,
    { email, reason },
  );
}

/**
 * Create a rate limited error.
 */
export function rateLimited(retryAfter: number): ZephyrError {
  return createError(
    "RATE_LIMITED",
    `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
    { retryAfter },
  );
}

/**
 * Create an unsubscribed error.
 */
export function unsubscribed(
  email: string,
  unsubscribedAt: string,
): ZephyrError {
  return createError("UNSUBSCRIBED", `Recipient has unsubscribed: ${email}`, {
    email,
    unsubscribedAt,
  });
}

/**
 * Create a provider error.
 */
export function providerError(
  provider: string,
  message: string,
  statusCode?: number,
): ZephyrError {
  return createError("PROVIDER_ERROR", `${provider} error: ${message}`, {
    provider,
    statusCode,
  });
}

/**
 * Create a template error.
 */
export function templateError(template: string, message: string): ZephyrError {
  return createError("TEMPLATE_ERROR", `Template render failed: ${message}`, {
    template,
  });
}

/**
 * Create a circuit open error.
 */
export function circuitOpen(provider: string, opensAt: string): ZephyrError {
  return createError(
    "CIRCUIT_OPEN",
    `Circuit breaker open for ${provider}. Will retry at ${opensAt}.`,
    { provider, opensAt },
  );
}

/**
 * Create an idempotency conflict error.
 */
export function idempotencyConflict(key: string): ZephyrError {
  return createError(
    "IDEMPOTENCY_CONFLICT",
    `Duplicate request with idempotency key: ${key}`,
    { idempotencyKey: key },
  );
}
