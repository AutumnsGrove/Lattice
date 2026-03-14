/**
 * Tests for Account page utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  daysRemaining,
  sanitizeErrorMessage,
  USAGE_WARNING_THRESHOLD,
} from "./utils";

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format a valid ISO date string", () => {
    // Use noon UTC to avoid timezone boundary issues
    // (midnight UTC shows as previous day in western timezones)
    const result = formatDate("2026-01-15T12:00:00.000Z");
    // Result depends on locale, but should contain these parts
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });

  it("should return em dash for null input", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("should return em dash for undefined input", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("should return em dash for empty string", () => {
    expect(formatDate("")).toBe("—");
  });

  it("should return em dash for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("should handle dates at different times of day", () => {
    const morning = formatDate("2026-06-20T08:30:00.000Z");
    const evening = formatDate("2026-06-20T20:30:00.000Z");
    // Both should produce valid formatted dates
    expect(morning).toContain("2026");
    expect(evening).toContain("2026");
  });
});

// ============================================================================
// daysRemaining Tests
// ============================================================================

describe("daysRemaining", () => {
  beforeEach(() => {
    // Mock current date to 2026-01-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should calculate days remaining correctly", () => {
    // 10 days from now
    expect(daysRemaining("2026-01-25T00:00:00.000Z")).toBe(10);
  });

  it("should return 0 for past dates", () => {
    expect(daysRemaining("2026-01-10T00:00:00.000Z")).toBe(0);
  });

  it("should return 0 for today", () => {
    expect(daysRemaining("2026-01-15T00:00:00.000Z")).toBe(0);
  });

  it("should return 1 for tomorrow", () => {
    expect(daysRemaining("2026-01-16T12:00:00.000Z")).toBe(1);
  });

  it("should return null for null input", () => {
    expect(daysRemaining(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(daysRemaining(undefined)).toBeNull();
  });

  it("should return null for invalid date string", () => {
    expect(daysRemaining("invalid-date")).toBeNull();
  });

  it("should handle dates far in the future", () => {
    // 365 days from now
    expect(daysRemaining("2027-01-15T00:00:00.000Z")).toBe(365);
  });
});

// ============================================================================
// sanitizeErrorMessage Tests
// ============================================================================

describe("sanitizeErrorMessage", () => {
  const fallback = "An error occurred";

  it("should return the error message for safe errors", () => {
    const error = new Error("Invalid plan selected");
    expect(sanitizeErrorMessage(error, fallback)).toBe("Invalid plan selected");
  });

  it("should return fallback for non-Error objects", () => {
    expect(sanitizeErrorMessage("string error", fallback)).toBe(fallback);
    expect(sanitizeErrorMessage(null, fallback)).toBe(fallback);
    expect(sanitizeErrorMessage(undefined, fallback)).toBe(fallback);
    expect(sanitizeErrorMessage({ message: "object" }, fallback)).toBe(
      fallback,
    );
  });

  it("should filter out Stripe API key prefixes (sk_)", () => {
    const error = new Error("Invalid API key: sk_test_123456");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should filter out Stripe publishable key prefixes (pk_)", () => {
    const error = new Error("Missing pk_live_abcdef in request");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should filter out Stripe error codes (stripe_)", () => {
    const error = new Error("stripe_card_declined: Your card was declined");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should filter out INTERNAL errors", () => {
    const error = new Error("INTERNAL: Database connection failed");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should filter out 500 errors", () => {
    const error = new Error("HTTP 500: Internal Server Error");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should return fallback for empty error message", () => {
    const error = new Error("");
    expect(sanitizeErrorMessage(error, fallback)).toBe(fallback);
  });

  it("should allow user-friendly error messages through", () => {
    const userFriendlyErrors = [
      "Your subscription has been cancelled",
      "Plan not found",
      "Rate limit exceeded. Try again later.",
      "Invalid export type",
      "Payment method required",
    ];

    for (const msg of userFriendlyErrors) {
      const error = new Error(msg);
      expect(sanitizeErrorMessage(error, fallback)).toBe(msg);
    }
  });

  it("should handle errors with only whitespace", () => {
    const error = new Error("   ");
    expect(sanitizeErrorMessage(error, fallback)).toBe("   ");
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("USAGE_WARNING_THRESHOLD", () => {
  it("should be 80 percent", () => {
    expect(USAGE_WARNING_THRESHOLD).toBe(80);
  });
});
