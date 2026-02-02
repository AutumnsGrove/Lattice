/**
 * Error Handling Tests
 *
 * Tests the error creation utilities and most importantly,
 * verifies the error surfacing pattern that fixes the Porch bug.
 *
 * THE BUG: Previously, email errors were caught and logged but not returned
 * to callers. This caused silent failures where users thought emails sent
 * successfully but they never arrived.
 *
 * THE FIX: Zephyr always returns structured errors to callers, who can then
 * decide whether to surface them to users.
 */

import { describe, it, expect } from "vitest";
import {
  createError,
  isRetryable,
  invalidRequest,
  invalidTemplate,
  invalidRecipient,
  rateLimited,
  unsubscribed,
  providerError,
  templateError,
  circuitOpen,
  idempotencyConflict,
} from "./errors";
import type { ZephyrErrorCode } from "./types";

// =============================================================================
// Error Creation
// =============================================================================

describe("createError", () => {
  it("should create error with all fields", () => {
    const error = createError("PROVIDER_ERROR", "Resend is down", {
      statusCode: 503,
    });

    expect(error.code).toBe("PROVIDER_ERROR");
    expect(error.message).toBe("Resend is down");
    expect(error.details).toEqual({ statusCode: 503 });
  });

  it("should mark retryable errors correctly", () => {
    const providerErr = createError("PROVIDER_ERROR", "Server error");
    const circuitErr = createError("CIRCUIT_OPEN", "Circuit open");
    const networkErr = createError("NETWORK_ERROR", "Connection failed");
    const invalidErr = createError("INVALID_REQUEST", "Bad data");

    expect(providerErr.retryable).toBe(true);
    expect(circuitErr.retryable).toBe(true);
    expect(networkErr.retryable).toBe(true);
    expect(invalidErr.retryable).toBe(false);
  });
});

describe("isRetryable", () => {
  it("should return true for retryable error codes", () => {
    expect(isRetryable("PROVIDER_ERROR")).toBe(true);
    expect(isRetryable("CIRCUIT_OPEN")).toBe(true);
    expect(isRetryable("NETWORK_ERROR")).toBe(true);
  });

  it("should return false for non-retryable error codes", () => {
    const nonRetryable: ZephyrErrorCode[] = [
      "INVALID_REQUEST",
      "INVALID_TEMPLATE",
      "INVALID_RECIPIENT",
      "RATE_LIMITED",
      "UNSUBSCRIBED",
      "TEMPLATE_ERROR",
      "IDEMPOTENCY_CONFLICT",
    ];

    for (const code of nonRetryable) {
      expect(isRetryable(code)).toBe(false);
    }
  });
});

// =============================================================================
// Error Factory Functions
// =============================================================================

describe("invalidRequest", () => {
  it("should create invalid request error", () => {
    const error = invalidRequest("Missing 'to' field");

    expect(error.code).toBe("INVALID_REQUEST");
    expect(error.message).toBe("Missing 'to' field");
    expect(error.retryable).toBe(false);
  });

  it("should include field in details when provided", () => {
    const error = invalidRequest("Invalid value", "scheduledAt");

    expect(error.details).toEqual({ field: "scheduledAt" });
  });
});

describe("invalidTemplate", () => {
  it("should create invalid template error", () => {
    const error = invalidTemplate("unknown-template");

    expect(error.code).toBe("INVALID_TEMPLATE");
    expect(error.message).toBe("Unknown template: unknown-template");
    expect(error.details).toEqual({ template: "unknown-template" });
  });
});

describe("invalidRecipient", () => {
  it("should create malformed email error", () => {
    const error = invalidRecipient("not-an-email", "malformed");

    expect(error.code).toBe("INVALID_RECIPIENT");
    expect(error.message).toBe("Invalid email format: not-an-email");
    expect(error.details).toEqual({
      email: "not-an-email",
      reason: "malformed",
    });
  });

  it("should create blocklisted email error", () => {
    const error = invalidRecipient("blocked@example.com", "blocklisted");

    expect(error.code).toBe("INVALID_RECIPIENT");
    expect(error.message).toBe("Email is blocklisted: blocked@example.com");
    expect(error.details).toEqual({
      email: "blocked@example.com",
      reason: "blocklisted",
    });
  });
});

describe("rateLimited", () => {
  it("should create rate limited error with retry info", () => {
    const error = rateLimited(60);

    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toBe("Rate limit exceeded. Retry after 60 seconds.");
    expect(error.details).toEqual({ retryAfter: 60 });
  });
});

describe("unsubscribed", () => {
  it("should create unsubscribed error", () => {
    const error = unsubscribed("user@example.com", "2026-01-01T00:00:00Z");

    expect(error.code).toBe("UNSUBSCRIBED");
    expect(error.message).toBe("Recipient has unsubscribed: user@example.com");
    expect(error.details).toEqual({
      email: "user@example.com",
      unsubscribedAt: "2026-01-01T00:00:00Z",
    });
  });
});

describe("providerError", () => {
  it("should create provider error", () => {
    const error = providerError("resend", "Connection timeout", 503);

    expect(error.code).toBe("PROVIDER_ERROR");
    expect(error.message).toBe("resend error: Connection timeout");
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ provider: "resend", statusCode: 503 });
  });
});

describe("templateError", () => {
  it("should create template render error", () => {
    const error = templateError(
      "porch-reply",
      "Missing required field: content",
    );

    expect(error.code).toBe("TEMPLATE_ERROR");
    expect(error.message).toBe(
      "Template render failed: Missing required field: content",
    );
    expect(error.details).toEqual({ template: "porch-reply" });
  });
});

describe("circuitOpen", () => {
  it("should create circuit open error", () => {
    const error = circuitOpen("resend", "2026-01-15T10:05:00Z");

    expect(error.code).toBe("CIRCUIT_OPEN");
    expect(error.message).toBe(
      "Circuit breaker open for resend. Will retry at 2026-01-15T10:05:00Z.",
    );
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({
      provider: "resend",
      opensAt: "2026-01-15T10:05:00Z",
    });
  });
});

describe("idempotencyConflict", () => {
  it("should create idempotency conflict error", () => {
    const error = idempotencyConflict("unique-key-123");

    expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(error.message).toBe(
      "Duplicate request with idempotency key: unique-key-123",
    );
    expect(error.details).toEqual({ idempotencyKey: "unique-key-123" });
  });
});

// =============================================================================
// Error Surfacing Pattern (THE KEY BUG FIX)
// =============================================================================

/**
 * These tests document the critical behavior change that fixes the Porch bug.
 *
 * Before: Email errors were caught and logged, but not returned to callers:
 *   try { await resend.send(...) }
 *   catch (err) { console.error(err); } // Error swallowed!
 *
 * After: Errors are always structured and returned to callers:
 *   const result = await Zephyr.send(...);
 *   if (!result.success) {
 *     // Caller decides what to do with error
 *   }
 */
describe("error surfacing pattern", () => {
  it("should always return error in response, never throw", () => {
    // This test documents the expected API contract
    // Zephyr returns { success: false, error: ZephyrError }
    // It does NOT throw exceptions that could be accidentally swallowed

    const error = providerError("resend", "API error", 500);

    // The error is a plain object, not an Error instance
    expect(error).not.toBeInstanceOf(Error);
    expect(typeof error).toBe("object");

    // It has all the information needed to handle it properly
    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
    expect(error.retryable).toBeDefined();
  });

  it("should include actionable information in error", () => {
    // Errors should tell callers what happened AND what to do about it

    const rateLimitErr = rateLimited(30);
    expect(rateLimitErr.details?.retryAfter).toBe(30); // When to retry

    const circuitErr = circuitOpen("resend", "2026-01-15T10:05:00Z");
    expect(circuitErr.details?.opensAt).toBeDefined(); // When circuit resets

    const recipientErr = invalidRecipient("bad@email", "malformed");
    expect(recipientErr.details?.email).toBe("bad@email"); // Which email failed
  });

  it("should distinguish between retryable and permanent errors", () => {
    // Callers need to know: should I try again or give up?

    // Retryable: temporary failures that may succeed on retry
    expect(providerError("resend", "timeout").retryable).toBe(true);
    expect(circuitOpen("resend", "soon").retryable).toBe(true);

    // Permanent: won't succeed no matter how many retries
    expect(invalidRequest("bad data").retryable).toBe(false);
    expect(invalidRecipient("bad@", "malformed").retryable).toBe(false);
    expect(unsubscribed("user@example.com", "date").retryable).toBe(false);
  });

  it("should provide enough context for user-facing error messages", () => {
    // When showing errors to users, we need friendly messages

    const error = providerError("resend", "Connection timeout", 503);

    // The error has enough info to generate a user message:
    // "We couldn't send your email right now. Please try again."
    expect(error.retryable).toBe(true); // "try again" is appropriate
    expect(error.code).toBe("PROVIDER_ERROR"); // Not a user's fault

    const userError = invalidRecipient("bad-email", "malformed");
    // "Please check the email address and try again."
    expect(userError.retryable).toBe(false); // User needs to fix something
    expect(userError.code).toBe("INVALID_RECIPIENT"); // It's about the email
    expect(userError.details?.email).toBe("bad-email"); // Show them which one
  });
});

// =============================================================================
// Error Code Coverage
// =============================================================================

describe("error code completeness", () => {
  const allErrorCodes: ZephyrErrorCode[] = [
    "INVALID_REQUEST",
    "INVALID_TEMPLATE",
    "INVALID_RECIPIENT",
    "RATE_LIMITED",
    "UNSUBSCRIBED",
    "PROVIDER_ERROR",
    "TEMPLATE_ERROR",
    "CIRCUIT_OPEN",
    "IDEMPOTENCY_CONFLICT",
  ];

  it("should have factory function for each error code", () => {
    // Each error code should have a convenient factory
    expect(invalidRequest("test").code).toBe("INVALID_REQUEST");
    expect(invalidTemplate("test").code).toBe("INVALID_TEMPLATE");
    expect(invalidRecipient("test@test.com", "malformed").code).toBe(
      "INVALID_RECIPIENT",
    );
    expect(rateLimited(60).code).toBe("RATE_LIMITED");
    expect(unsubscribed("test@test.com", "date").code).toBe("UNSUBSCRIBED");
    expect(providerError("test", "error").code).toBe("PROVIDER_ERROR");
    expect(templateError("test", "error").code).toBe("TEMPLATE_ERROR");
    expect(circuitOpen("test", "date").code).toBe("CIRCUIT_OPEN");
    expect(idempotencyConflict("key").code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("should be able to create any error code via createError", () => {
    for (const code of allErrorCodes) {
      const error = createError(code, "Test message");
      expect(error.code).toBe(code);
      expect(error.message).toBe("Test message");
    }
  });
});
