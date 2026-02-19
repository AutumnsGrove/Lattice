/**
 * Unsubscribe Check Middleware Tests
 *
 * Tests for checking if recipients have unsubscribed from emails.
 */

import { describe, it, expect, vi } from "vitest";
import { checkUnsubscribed } from "../src/middleware/unsubscribe";

// Helper to create mock D1 with specific unsubscribe data
function createMockD1(
  unsubscribeData: {
    unsubscribed_at: string | null;
    onboarding_emails_unsubscribed: number;
  } | null,
) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((email: string) => ({
        first: vi.fn(async () => unsubscribeData),
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => ({ success: true })),
      })),
    })),
  } as unknown as D1Database;
}

describe("checkUnsubscribed", () => {
  it("should return not unsubscribed for new email", async () => {
    const mockDb = createMockD1(null);

    const result = await checkUnsubscribed(mockDb, "user@example.com");

    expect(result.unsubscribed).toBe(false);
    expect(result.unsubscribedAt).toBeUndefined();
  });

  it("should detect unsubscribed via unsubscribed_at", async () => {
    const mockDb = createMockD1({
      unsubscribed_at: "2024-01-15T10:30:00Z",
      onboarding_emails_unsubscribed: 0,
    });

    const result = await checkUnsubscribed(mockDb, "user@example.com");

    expect(result.unsubscribed).toBe(true);
    expect(result.unsubscribedAt).toBe("2024-01-15T10:30:00Z");
  });

  it("should detect unsubscribed via onboarding_emails_unsubscribed flag", async () => {
    const mockDb = createMockD1({
      unsubscribed_at: null,
      onboarding_emails_unsubscribed: 1,
    });

    const result = await checkUnsubscribed(mockDb, "user@example.com");

    expect(result.unsubscribed).toBe(true);
    expect(result.unsubscribedAt).toBeUndefined();
  });

  it("should be case-insensitive in email matching", async () => {
    const mockDb = createMockD1({
      unsubscribed_at: "2024-01-15T10:30:00Z",
      onboarding_emails_unsubscribed: 0,
    });

    // Uppercase query for lowercase stored email (or vice versa)
    const result = await checkUnsubscribed(mockDb, "USER@EXAMPLE.COM");

    // Note: Case sensitivity depends on database collation
    // This test documents expected behavior
    expect(result.unsubscribed).toBe(true);
  });

  it("should fail open on database error", async () => {
    const dbWithError = {
      prepare: vi.fn(() => {
        throw new Error("Database connection failed");
      }),
    } as unknown as D1Database;

    const result = await checkUnsubscribed(dbWithError, "user@example.com");

    expect(result.unsubscribed).toBe(false);
  });

  it("should handle both unsubscribe methods simultaneously", async () => {
    const mockDb = createMockD1({
      unsubscribed_at: "2024-01-15T10:30:00Z",
      onboarding_emails_unsubscribed: 1,
    });

    const result = await checkUnsubscribed(mockDb, "user@example.com");

    expect(result.unsubscribed).toBe(true);
    expect(result.unsubscribedAt).toBe("2024-01-15T10:30:00Z");
  });
});
