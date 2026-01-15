/**
 * Database Safety Layer Tests
 *
 * Tests for the safety guards that protect database operations,
 * especially when AI agents are performing database operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SafeDatabase,
  SafetyViolationError,
  withSafetyGuards,
  withAgentSafetyGuards,
  AGENT_SAFE_CONFIG,
} from "./database-safety.js";

// ============================================================================
// Mock D1 Database
// ============================================================================

function createMockD1(options: { countResult?: number } = {}) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        run: vi.fn(async () => ({
          success: true,
          meta: { changes: 1 },
        })),
        first: vi.fn(async () => ({
          count: options.countResult ?? 0,
        })),
        all: vi.fn(async () => ({
          results: [],
        })),
      })),
    })),
    exec: vi.fn(async () => ({ success: true })),
  };
}

// ============================================================================
// DDL Blocking Tests
// ============================================================================

describe("SafeDatabase - DDL Blocking", () => {
  it("blocks DROP TABLE operations", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    await expect(safeDb.execute("DROP TABLE users")).rejects.toThrow(
      SafetyViolationError,
    );

    // Verify the error code
    try {
      await safeDb.execute("DROP TABLE users");
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("DDL_BLOCKED");
    }
  });

  it("blocks TRUNCATE operations", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    await expect(safeDb.execute("TRUNCATE TABLE logs")).rejects.toThrow(
      SafetyViolationError,
    );
  });

  it("blocks ALTER TABLE DROP operations", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    await expect(
      safeDb.execute("ALTER TABLE users DROP COLUMN email"),
    ).rejects.toThrow(SafetyViolationError);
  });

  it("allows DDL when explicitly enabled", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any, { allowDDL: true });

    await expect(safeDb.execute("DROP TABLE temp")).resolves.not.toThrow();
  });
});

// ============================================================================
// DELETE Safety Tests
// ============================================================================

describe("SafeDatabase - DELETE Operations", () => {
  it("blocks DELETE without WHERE clause", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    await expect(safeDb.execute("DELETE FROM logs")).rejects.toThrow(
      SafetyViolationError,
    );

    // Verify the error code
    try {
      await safeDb.execute("DELETE FROM logs");
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("MISSING_WHERE");
    }
  });

  it("allows DELETE with WHERE clause", async () => {
    const db = createMockD1({ countResult: 5 });
    const safeDb = withSafetyGuards(db as any);

    await expect(
      safeDb.execute("DELETE FROM logs WHERE created_at < ?", [Date.now()]),
    ).resolves.not.toThrow();
  });

  it("blocks DELETE exceeding row limit", async () => {
    const db = createMockD1({ countResult: 200 });
    const safeDb = withSafetyGuards(db as any, { maxDeleteRows: 100 });

    await expect(
      safeDb.execute("DELETE FROM logs WHERE status = ?", ["old"]),
    ).rejects.toThrow(SafetyViolationError);

    // Verify the error code
    try {
      await safeDb.execute("DELETE FROM logs WHERE status = ?", ["old"]);
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("ROW_LIMIT_EXCEEDED");
    }
  });

  it("allows DELETE within row limit", async () => {
    const db = createMockD1({ countResult: 50 });
    const safeDb = withSafetyGuards(db as any, { maxDeleteRows: 100 });

    await expect(
      safeDb.execute("DELETE FROM logs WHERE status = ?", ["old"]),
    ).resolves.not.toThrow();
  });
});

// ============================================================================
// Protected Tables Tests
// ============================================================================

describe("SafeDatabase - Protected Tables", () => {
  it("blocks DELETE on protected tables", async () => {
    const db = createMockD1({ countResult: 1 });
    const safeDb = withSafetyGuards(db as any, {
      protectedTables: ["users", "payments"],
    });

    await expect(
      safeDb.execute("DELETE FROM users WHERE id = ?", ["123"]),
    ).rejects.toThrow(SafetyViolationError);

    // Verify the error code
    try {
      await safeDb.execute("DELETE FROM users WHERE id = ?", ["123"]);
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("PROTECTED_TABLE");
    }
  });

  it("blocks UPDATE on protected tables", async () => {
    const db = createMockD1({ countResult: 1 });
    const safeDb = withSafetyGuards(db as any, {
      protectedTables: ["users", "payments"],
    });

    await expect(
      safeDb.execute("UPDATE users SET email = ? WHERE id = ?", [
        "new@email.com",
        "123",
      ]),
    ).rejects.toThrow(SafetyViolationError);

    // Verify the error code
    try {
      await safeDb.execute("UPDATE users SET email = ? WHERE id = ?", [
        "new@email.com",
        "123",
      ]);
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("PROTECTED_TABLE");
    }
  });

  it("allows operations on non-protected tables", async () => {
    const db = createMockD1({ countResult: 1 });
    const safeDb = withSafetyGuards(db as any, {
      protectedTables: ["users", "payments"],
    });

    await expect(
      safeDb.execute("DELETE FROM logs WHERE id = ?", ["123"]),
    ).resolves.not.toThrow();
  });
});

// ============================================================================
// Dangerous Pattern Detection Tests
// ============================================================================

describe("SafeDatabase - Dangerous Patterns", () => {
  it("blocks SQL injection attempts with stacked queries", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    await expect(
      safeDb.execute("SELECT * FROM users WHERE id = 1; DROP TABLE users"),
    ).rejects.toThrow(SafetyViolationError);

    // Verify the error code
    try {
      await safeDb.execute(
        "SELECT * FROM users WHERE id = 1; DROP TABLE users",
      );
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("DANGEROUS_PATTERN");
    }

    await expect(
      safeDb.execute("SELECT * FROM users WHERE id = 1; DELETE FROM sessions"),
    ).rejects.toThrow(SafetyViolationError);
  });

  it("allows legitimate SQL comments (not blocked)", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    // SQL comments should NOT be blocked - they're legitimate
    // This tests that we removed the false positive patterns
    await expect(
      safeDb.query("SELECT * FROM users WHERE id = ? -- user lookup", ["123"]),
    ).resolves.not.toThrow();
  });
});

// ============================================================================
// Audit Logging Tests
// ============================================================================

describe("SafeDatabase - Audit Logging", () => {
  it("logs operations when audit is enabled", async () => {
    const db = createMockD1();
    const logs: any[] = [];
    const safeDb = withSafetyGuards(db as any, {
      auditLog: true,
      auditLogFn: (entry) => logs.push(entry),
      redactParams: false,
    });

    await safeDb.execute("INSERT INTO users (name) VALUES (?)", ["test"]);

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].operation).toBe("INSERT");
    expect(logs[0].sql).toContain("INSERT INTO users");
  });

  it("redacts parameters by default", async () => {
    const db = createMockD1();
    const logs: any[] = [];
    const safeDb = withSafetyGuards(db as any, {
      auditLog: true,
      auditLogFn: (entry) => logs.push(entry),
      // redactParams defaults to true
    });

    await safeDb.execute("INSERT INTO users (password) VALUES (?)", [
      "secret123",
    ]);

    expect(logs[0].params).toEqual(["[REDACTED]"]);
  });

  it("includes full params when redaction is disabled", async () => {
    const db = createMockD1();
    const logs: any[] = [];
    const safeDb = withSafetyGuards(db as any, {
      auditLog: true,
      auditLogFn: (entry) => logs.push(entry),
      redactParams: false,
    });

    await safeDb.execute("INSERT INTO users (name) VALUES (?)", ["visible"]);

    expect(logs[0].params).toEqual(["visible"]);
  });
});

// ============================================================================
// Dry Run Mode Tests
// ============================================================================

describe("SafeDatabase - Dry Run Mode", () => {
  it("does not execute queries in dry run mode", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any, { dryRun: true });

    const result = await safeDb.execute("INSERT INTO users (name) VALUES (?)", [
      "test",
    ]);

    // In dry run mode, changes should be 0 and success should be true
    expect(result.changes).toBe(0);
    expect(result.success).toBe(true);
  });

  it("returns empty results for queries in dry run", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any, { dryRun: true });

    const results = await safeDb.query("SELECT * FROM users");

    expect(results).toEqual([]);
  });
});

// ============================================================================
// Agent Safe Config Tests
// ============================================================================

describe("Agent Safe Configuration", () => {
  it("has secure defaults", () => {
    expect(AGENT_SAFE_CONFIG.allowDDL).toBe(false);
    expect(AGENT_SAFE_CONFIG.maxDeleteRows).toBeLessThanOrEqual(100);
    expect(AGENT_SAFE_CONFIG.auditLog).toBe(true);
    expect(AGENT_SAFE_CONFIG.redactParams).toBe(true);
    expect(AGENT_SAFE_CONFIG.protectedTables).toContain("users");
  });

  it("withAgentSafetyGuards applies agent-safe defaults", async () => {
    const db = createMockD1({ countResult: 1 });
    const safeDb = withAgentSafetyGuards(db as any);

    // Should block protected table operations
    await expect(
      safeDb.execute("DELETE FROM users WHERE id = ?", ["123"]),
    ).rejects.toThrow(SafetyViolationError);

    // Verify the error code
    try {
      await safeDb.execute("DELETE FROM users WHERE id = ?", ["123"]);
    } catch (e) {
      expect((e as SafetyViolationError).code).toBe("PROTECTED_TABLE");
    }

    await expect(
      safeDb.execute("DELETE FROM sessions WHERE id = ?", ["123"]),
    ).rejects.toThrow(SafetyViolationError);
  });
});

// ============================================================================
// Error Type Tests
// ============================================================================

describe("SafetyViolationError", () => {
  it("includes error code", () => {
    const error = new SafetyViolationError("Test error", "DDL_BLOCKED", "DROP");

    expect(error.code).toBe("DDL_BLOCKED");
    expect(error.sql).toBe("DROP");
    expect(error.name).toBe("SafetyViolationError");
  });

  it("can be caught by type", async () => {
    const db = createMockD1();
    const safeDb = withSafetyGuards(db as any);

    try {
      await safeDb.execute("DROP TABLE users");
    } catch (error) {
      expect(error).toBeInstanceOf(SafetyViolationError);
      if (error instanceof SafetyViolationError) {
        expect(error.code).toBe("DDL_BLOCKED");
      }
    }
  });
});
