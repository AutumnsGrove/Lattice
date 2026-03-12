import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportDatabase } from "./exporter";

/**
 * Creates a mock D1Database for testing
 */
function createMockD1(): any {
	const boundStatement = {
		all: vi.fn(),
		first: vi.fn(),
		run: vi.fn(),
		bind: vi.fn().mockReturnThis(),
	};
	return {
		prepare: vi.fn().mockReturnValue(boundStatement),
		_boundStatement: boundStatement,
	};
}

describe("exportDatabase", () => {
	let mockDb: any;

	beforeEach(() => {
		mockDb = createMockD1();
	});

	it("exports empty database with no tables", async () => {
		// Mock sqlite_master query to return no tables
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({ results: [] });
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.tableCount).toBe(0);
		expect(result.rowCount).toBe(0);
		expect(result.sql).toContain("-- Grove Backup: test_db");
		expect(result.sql).toContain("-- Job ID: job-123");
		expect(result.sql).toContain("PRAGMA foreign_keys=OFF;");
		expect(result.sql).toContain("BEGIN TRANSACTION;");
		expect(result.sql).toContain("COMMIT;");
		expect(result.sql).toContain("PRAGMA foreign_keys=ON;");
		expect(result.sizeBytes).toBeGreaterThan(0);
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("exports single table with rows", async () => {
		const createTableSql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [{ name: "users", sql: createTableSql }],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 2 });
			} else if (sql.includes("SELECT * FROM")) {
				stmt.all.mockResolvedValueOnce({
					results: [
						{ id: 1, name: "Alice" },
						{ id: 2, name: "Bob" },
					],
				});
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.tableCount).toBe(1);
		expect(result.rowCount).toBe(2);
		expect(result.sql).toContain('DROP TABLE IF EXISTS "users";');
		expect(result.sql).toContain(createTableSql);
		expect(result.sql).toContain('INSERT INTO "users"');
		expect(result.sql).toContain('("id", "name")');
		expect(result.sql).toContain("VALUES (1, 'Alice')");
		expect(result.sql).toContain("VALUES (2, 'Bob')");
		expect(result.sizeBytes).toBeGreaterThan(0);
	});

	it("exports multiple tables", async () => {
		const usersSql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
		const postsSql = "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT)";

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [
						{ name: "users", sql: usersSql },
						{ name: "posts", sql: postsSql },
					],
				});
			} else if (sql.includes('COUNT(*) as count FROM "users"')) {
				stmt.first.mockResolvedValueOnce({ count: 1 });
			} else if (sql.includes('COUNT(*) as count FROM "posts"')) {
				stmt.first.mockResolvedValueOnce({ count: 1 });
			} else if (sql.includes('SELECT * FROM "users"')) {
				stmt.all.mockResolvedValueOnce({
					results: [{ id: 1, name: "Alice" }],
				});
			} else if (sql.includes('SELECT * FROM "posts"')) {
				stmt.all.mockResolvedValueOnce({
					results: [{ id: 1, user_id: 1, title: "Hello" }],
				});
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.tableCount).toBe(2);
		expect(result.rowCount).toBe(2);
		expect(result.sql).toContain('DROP TABLE IF EXISTS "users";');
		expect(result.sql).toContain('DROP TABLE IF EXISTS "posts";');
		expect(result.sql).toContain(usersSql);
		expect(result.sql).toContain(postsSql);
	});

	it("handles tables with zero rows", async () => {
		const createTableSql = "CREATE TABLE empty_table (id INTEGER PRIMARY KEY)";
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [{ name: "empty_table", sql: createTableSql }],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 0 });
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.tableCount).toBe(1);
		expect(result.rowCount).toBe(0);
		expect(result.sql).toContain('DROP TABLE IF EXISTS "empty_table";');
		expect(result.sql).toContain(createTableSql);
		// Should not have INSERT statements for empty table
		expect(result.sql).not.toContain('INSERT INTO "empty_table"');
	});

	it("batches large row counts with pagination", async () => {
		const createTableSql = "CREATE TABLE large_table (id INTEGER PRIMARY KEY, value TEXT)";
		let callCount = 0;

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [{ name: "large_table", sql: createTableSql }],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 2500 }); // 2500 rows = 3 batches
			} else if (sql.includes("SELECT * FROM")) {
				// Track which batch we're on
				callCount++;
				if (callCount === 1) {
					// First batch: rows 1-1000
					const results = Array.from({ length: 1000 }, (_, i) => ({
						id: i + 1,
						value: `value_${i + 1}`,
					}));
					stmt.all.mockResolvedValueOnce({ results });
				} else if (callCount === 2) {
					// Second batch: rows 1001-2000
					const results = Array.from({ length: 1000 }, (_, i) => ({
						id: i + 1001,
						value: `value_${i + 1001}`,
					}));
					stmt.all.mockResolvedValueOnce({ results });
				} else if (callCount === 3) {
					// Third batch: rows 2001-2500
					const results = Array.from({ length: 500 }, (_, i) => ({
						id: i + 2001,
						value: `value_${i + 2001}`,
					}));
					stmt.all.mockResolvedValueOnce({ results });
				}
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.tableCount).toBe(1);
		expect(result.rowCount).toBe(2500);
		// Verify SELECT statements were called with correct LIMIT/OFFSET
		expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1000 OFFSET 0"));
		expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1000 OFFSET 1000"));
		expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1000 OFFSET 2000"));
	});

	it("includes database name and job ID in SQL header", async () => {
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({ results: [] });
			}
			return stmt;
		});

		const dbName = "production_db";
		const jobId = "backup-job-abc-123";

		const result = await exportDatabase(mockDb, dbName, jobId);

		expect(result.sql).toContain(`-- Grove Backup: ${dbName}`);
		expect(result.sql).toContain(`-- Job ID: ${jobId}`);
	});

	it("returns correct metadata in result", async () => {
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [
						{
							name: "test_table",
							sql: "CREATE TABLE test_table (id INTEGER PRIMARY KEY)",
						},
					],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 5 });
			} else if (sql.includes("SELECT * FROM")) {
				stmt.all.mockResolvedValueOnce({
					results: Array.from({ length: 5 }, (_, i) => ({ id: i + 1 })),
				});
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result).toHaveProperty("sql");
		expect(result).toHaveProperty("tableCount");
		expect(result).toHaveProperty("rowCount");
		expect(result).toHaveProperty("sizeBytes");
		expect(result).toHaveProperty("durationMs");

		expect(typeof result.sql).toBe("string");
		expect(typeof result.tableCount).toBe("number");
		expect(typeof result.rowCount).toBe("number");
		expect(typeof result.sizeBytes).toBe("number");
		expect(typeof result.durationMs).toBe("number");

		expect(result.tableCount).toBe(1);
		expect(result.rowCount).toBe(5);
		expect(result.sizeBytes).toBeGreaterThan(0);
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("properly formats SQL values in INSERT statements", async () => {
		const createTableSql =
			"CREATE TABLE values_test (id INTEGER PRIMARY KEY, num INT, text TEXT, flag BOOLEAN)";

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [{ name: "values_test", sql: createTableSql }],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 1 });
			} else if (sql.includes("SELECT * FROM")) {
				stmt.all.mockResolvedValueOnce({
					results: [
						{
							id: 1,
							num: 42,
							text: "hello",
							flag: 1,
						},
					],
				});
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		// Verify SQL formatting
		expect(result.sql).toContain("VALUES (1, 42, 'hello', 1)");
	});

	it("handles NULL values in rows", async () => {
		const createTableSql =
			"CREATE TABLE nullable_test (id INTEGER PRIMARY KEY, optional_text TEXT)";

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("sqlite_master")) {
				stmt.all.mockResolvedValueOnce({
					results: [{ name: "nullable_test", sql: createTableSql }],
				});
			} else if (sql.includes("COUNT(*)")) {
				stmt.first.mockResolvedValueOnce({ count: 1 });
			} else if (sql.includes("SELECT * FROM")) {
				stmt.all.mockResolvedValueOnce({
					results: [
						{
							id: 1,
							optional_text: null,
						},
					],
				});
			}
			return stmt;
		});

		const result = await exportDatabase(mockDb, "test_db", "job-123");

		expect(result.sql).toContain("VALUES (1, NULL)");
	});
});
