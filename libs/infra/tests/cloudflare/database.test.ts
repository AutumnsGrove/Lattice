/**
 * Unit tests for CloudflareDatabase adapter.
 *
 * Validates D1 delegation, input validation, error handling,
 * and info() metadata.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareDatabase } from "../../src/cloudflare/database.js";
import { createMockD1, createMockD1Statement, type MockD1Database } from "./helpers.js";

// Mock logGroveError to verify error logging
vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareDatabase", () => {
	let mockD1: MockD1Database;
	let db: CloudflareDatabase;

	beforeEach(() => {
		vi.clearAllMocks();
		mockD1 = createMockD1();
		db = new CloudflareDatabase(mockD1 as unknown as D1Database, "test-db");
	});

	// =========================================================================
	// execute()
	// =========================================================================

	describe("execute", () => {
		it("should delegate simple SQL to D1", async () => {
			const stmt = createMockD1Statement({
				allResult: {
					results: [{ id: 1, title: "Hello" }],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 0 },
				},
			});
			mockD1.prepare.mockReturnValue(stmt);

			const result = await db.execute("SELECT * FROM posts");

			expect(mockD1.prepare).toHaveBeenCalledWith("SELECT * FROM posts");
			expect(result.results).toEqual([{ id: 1, title: "Hello" }]);
			expect(result.meta.rows_read).toBe(1);
		});

		it("should bind params when provided", async () => {
			const stmt = createMockD1Statement({
				allResult: {
					results: [{ id: 1 }],
					meta: { changes: 0, duration: 1, last_row_id: 0, rows_read: 1, rows_written: 0 },
				},
			});
			mockD1.prepare.mockReturnValue(stmt);

			await db.execute("SELECT * FROM posts WHERE id = ?", [42]);

			expect(stmt.bind).toHaveBeenCalledWith(42);
		});

		it("should skip bind when params are empty", async () => {
			const stmt = createMockD1Statement();
			mockD1.prepare.mockReturnValue(stmt);

			await db.execute("SELECT 1");

			expect(stmt.bind).not.toHaveBeenCalled();
		});

		it("should throw on empty SQL", async () => {
			await expect(db.execute("")).rejects.toThrow("SQL query cannot be empty");
		});

		it("should throw on whitespace-only SQL", async () => {
			await expect(db.execute("   ")).rejects.toThrow("SQL query cannot be empty");
		});

		it("should propagate D1 errors and log them", async () => {
			const stmt = createMockD1Statement();
			stmt.all.mockRejectedValue(new Error("D1_ERROR"));
			mockD1.prepare.mockReturnValue(stmt);

			await expect(db.execute("SELECT * FROM bad")).rejects.toThrow("D1_ERROR");

			const { logGroveError } = await import("@autumnsgrove/lattice/errors");
			expect(logGroveError).toHaveBeenCalled();
		});

		it("should extract meta from D1 response", async () => {
			const meta = { changes: 5, duration: 2.3, last_row_id: 10, rows_read: 5, rows_written: 5 };
			const stmt = createMockD1Statement({ allResult: { results: [], meta } });
			mockD1.prepare.mockReturnValue(stmt);

			const result = await db.execute("UPDATE posts SET title = ?", ["new"]);

			expect(result.meta).toEqual(meta);
		});

		it("should default missing meta fields to 0", async () => {
			const stmt = createMockD1Statement({ allResult: { results: [], meta: {} } });
			mockD1.prepare.mockReturnValue(stmt);

			const result = await db.execute("SELECT 1");

			expect(result.meta.changes).toBe(0);
			expect(result.meta.duration).toBe(0);
			expect(result.meta.last_row_id).toBe(0);
		});
	});

	// =========================================================================
	// batch()
	// =========================================================================

	describe("batch", () => {
		it("should delegate to D1 batch", async () => {
			const meta = { changes: 1, duration: 1, last_row_id: 1, rows_read: 0, rows_written: 1 };
			mockD1.batch.mockResolvedValue([
				{ results: [{ id: 1 }], meta },
				{ results: [{ id: 2 }], meta },
			]);

			const stmts = [
				createMockD1Statement() as unknown as import("../../src/types.js").BoundStatement,
				createMockD1Statement() as unknown as import("../../src/types.js").BoundStatement,
			];

			const results = await db.batch(stmts);

			expect(mockD1.batch).toHaveBeenCalled();
			expect(results).toHaveLength(2);
			expect(results[0]!.results).toEqual([{ id: 1 }]);
		});

		it("should throw on empty statements array", async () => {
			await expect(db.batch([])).rejects.toThrow("Batch statements array cannot be empty");
		});

		it("should throw on non-array input", async () => {
			await expect(db.batch(null as unknown as never[])).rejects.toThrow(
				"Batch statements array cannot be empty",
			);
		});

		it("should validate statements have .all() method", async () => {
			const badStmt = { bind: vi.fn() }; // missing .all()
			await expect(
				db.batch([badStmt as unknown as import("../../src/types.js").BoundStatement]),
			).rejects.toThrow("Batch statements must be created via CloudflareDatabase.prepare().bind()");
		});

		it("should propagate D1 batch errors", async () => {
			mockD1.batch.mockRejectedValue(new Error("BATCH_FAIL"));
			const stmts = [
				createMockD1Statement() as unknown as import("../../src/types.js").BoundStatement,
			];

			await expect(db.batch(stmts)).rejects.toThrow("BATCH_FAIL");
		});
	});

	// =========================================================================
	// prepare()
	// =========================================================================

	describe("prepare", () => {
		it("should return a PreparedStatement with bind()", () => {
			const stmt = db.prepare("SELECT * FROM posts WHERE id = ?");
			expect(stmt.bind).toBeTypeOf("function");
		});

		it("should delegate to D1 prepare", () => {
			db.prepare("INSERT INTO posts (title) VALUES (?)");
			expect(mockD1.prepare).toHaveBeenCalledWith("INSERT INTO posts (title) VALUES (?)");
		});

		it("should throw on empty SQL", () => {
			expect(() => db.prepare("")).toThrow("SQL query cannot be empty");
		});

		it("should throw on whitespace-only SQL", () => {
			expect(() => db.prepare("   ")).toThrow("SQL query cannot be empty");
		});
	});

	// =========================================================================
	// transaction()
	// =========================================================================

	describe("transaction", () => {
		it("should throw because D1 does not support interactive transactions", async () => {
			await expect(db.transaction(async () => "result")).rejects.toThrow(
				/transactions not supported/i,
			);
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider and database name", () => {
			const info = db.info();
			expect(info.provider).toBe("cloudflare-d1");
			expect(info.database).toBe("test-db");
			expect(info.readonly).toBe(false);
		});

		it("should default database name to 'default'", () => {
			const defaultDb = new CloudflareDatabase(mockD1 as unknown as D1Database);
			expect(defaultDb.info().database).toBe("default");
		});
	});
});
