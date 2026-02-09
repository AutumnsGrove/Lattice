/**
 * Tests for Activity Tracking
 *
 * These tests verify the lightweight activity tracking module
 * used for the inactivity reclamation system.
 */

import { describe, it, expect, vi } from "vitest";
import { updateLastActivity } from "./activity-tracking";

// Mock D1 database result
function createMockRunResult(success = true) {
  return {
    success,
    meta: {
      changes: success ? 1 : 0,
      duration: 5,
      last_row_id: 0,
      rows_read: 0,
      rows_written: 1,
    },
  };
}

// Mock D1 statement
function createMockStatement(runResult = createMockRunResult()) {
  return {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue(runResult),
    first: vi.fn(),
    all: vi.fn(),
  };
}

// Mock D1 database
function createMockDb(runResult = createMockRunResult()) {
  const statement = createMockStatement(runResult);
  return {
    prepare: vi.fn().mockReturnValue(statement),
    batch: vi.fn(),
    dump: vi.fn(),
  };
}

describe("updateLastActivity", () => {
  it("should call UPDATE query with correct SQL", async () => {
    const mockDb = createMockDb();
    const tenantId = "tenant-123";

    await updateLastActivity(mockDb, tenantId);

    expect(mockDb.prepare).toHaveBeenCalledWith(
      "UPDATE tenants SET last_activity_at = unixepoch() WHERE id = ?",
    );
  });

  it("should bind tenant ID to the query", async () => {
    const mockDb = createMockDb();
    const tenantId = "tenant-abc-123";

    await updateLastActivity(mockDb, tenantId);

    const statement = mockDb.prepare("");
    expect(statement.bind).toHaveBeenCalledWith(tenantId);
  });

  it("should resolve successfully when DB update succeeds", async () => {
    const mockDb = createMockDb();

    // Should not throw
    await expect(
      updateLastActivity(mockDb, "tenant-123"),
    ).resolves.toBeUndefined();
  });

  it("should return void (not a rejected promise) on DB failure", async () => {
    const mockDb = createMockDb();
    // Simulate DB failure
    mockDb.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error("D1 error")),
    });

    const result = updateLastActivity(mockDb, "tenant-123");

    // Should return undefined, not a rejected promise
    expect(await result).toBeUndefined();
  });

  it("should catch DB errors and log them without throwing", async () => {
    const mockDb = createMockDb();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

    // Simulate DB failure
    mockDb.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error("Connection failed")),
    });

    // Should not throw
    await expect(
      updateLastActivity(mockDb, "tenant-123"),
    ).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Activity] Failed to update last_activity_at:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle various D1 error types", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();
    const errorTypes = [
      new Error("D1_ERROR"),
      new Error("SYNTAX_ERROR"),
      new Error("CONSTRAINT_ERROR"),
      new Error("rate limit exceeded"),
    ];

    for (const error of errorTypes) {
      const mockDb = createMockDb();
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockRejectedValue(error),
      });

      const result = updateLastActivity(mockDb, "tenant-123");
      await expect(result).resolves.toBeUndefined();
    }

    expect(consoleErrorSpy).toHaveBeenCalledTimes(errorTypes.length);
    consoleErrorSpy.mockRestore();
  });

  it("should be safe to fire-and-forget (no await needed)", async () => {
    const mockDb = createMockDb();

    // This should not throw even though we're not awaiting
    const result = updateLastActivity(mockDb, "tenant-123");

    // The function returns immediately with undefined (wrapped in resolved promise)
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBeUndefined();
  });

  it("should handle concurrent updates for different tenants", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();
    const mockDb = createMockDb();

    const tenantIds = ["tenant-1", "tenant-2", "tenant-3"];

    // Fire multiple updates concurrently
    const promises = tenantIds.map((id) => updateLastActivity(mockDb, id));

    // All should resolve without throwing
    await Promise.all(promises);

    // Should have prepared 3 queries
    expect(mockDb.prepare).toHaveBeenCalledTimes(3);

    consoleErrorSpy.mockRestore();
  });

  it("should handle updates when changes is 0 (tenant not found)", async () => {
    const mockDb = createMockDb(createMockRunResult(false)); // success=true but changes=0

    // Should still not throw
    await expect(
      updateLastActivity(mockDb, "nonexistent-tenant"),
    ).resolves.toBeUndefined();
  });
});

describe("activity tracking fire-and-forget safety", () => {
  it("can be called without awaiting and won't crash the process", async () => {
    const mockDb = createMockDb();
    const originalError = console.error;
    let errorLogged = false;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("last_activity_at")) {
        errorLogged = true;
      }
    };

    // Simulate a slow DB that would block if awaited
    mockDb.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(createMockRunResult()), 100),
            ),
        ),
    });

    // Fire and forget - should return immediately
    const result = updateLastActivity(mockDb, "tenant-123");

    // Should not block - resolve immediately
    expect(result).toBeDefined();

    // Wait for the actual operation to complete
    await result;

    console.error = originalError;
  });
});
