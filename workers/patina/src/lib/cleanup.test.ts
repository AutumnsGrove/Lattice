import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanupOldBackups } from "./cleanup";

vi.mock("./utils", async () => {
	const actual = await vi.importActual("./utils");
	return { ...actual, getUnixTimestamp: vi.fn().mockReturnValue(1710000000) };
});

/**
 * Creates a mock R2Bucket for testing
 */
function createMockR2(): any {
	return {
		delete: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Creates a mock D1Database for testing
 */
function createMockD1(): any {
	const boundStatement = {
		all: vi.fn(),
		first: vi.fn(),
		run: vi.fn().mockResolvedValue({}),
		bind: vi.fn().mockReturnThis(),
	};
	return {
		prepare: vi.fn().mockReturnValue(boundStatement),
		_boundStatement: boundStatement,
	};
}

describe("cleanupOldBackups", () => {
	let mockBucket: any;
	let mockDb: any;

	beforeEach(() => {
		mockBucket = createMockR2();
		mockDb = createMockD1();
		vi.clearAllMocks();
	});

	it("returns zeros when no expired backups found", async () => {
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("backup_inventory")) {
				stmt.all.mockResolvedValueOnce({ results: [] });
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.totalExpired).toBe(0);
		expect(result.deleted).toBe(0);
		expect(result.failed).toBe(0);
		expect(result.freedBytes).toBe(0);
		expect(result.results).toEqual([]);
	});

	it("deletes expired backups from R2 and marks as deleted in DB", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/groveauth.sql",
				database_name: "groveauth",
				backup_date: "2026-01-01",
				size_bytes: 1024,
			},
		];

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			} else if (sql.includes("UPDATE backup_inventory")) {
				stmt.run.mockResolvedValueOnce({});
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.totalExpired).toBe(1);
		expect(result.deleted).toBe(1);
		expect(result.failed).toBe(0);
		expect(result.freedBytes).toBe(1024);

		// Verify R2 delete was called
		expect(mockBucket.delete).toHaveBeenCalledWith("2026-01-01/groveauth.sql");

		// Verify DB update was called
		expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE backup_inventory"));
	});

	it("tracks freed bytes from deleted backups", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/db1.sql",
				database_name: "db1",
				backup_date: "2026-01-01",
				size_bytes: 1000000,
			},
			{
				id: 2,
				r2_key: "2026-01-02/db2.sql",
				database_name: "db2",
				backup_date: "2026-01-02",
				size_bytes: 2000000,
			},
		];

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			} else if (sql.includes("UPDATE backup_inventory")) {
				stmt.run.mockResolvedValueOnce({});
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.freedBytes).toBe(3000000);
	});

	it("handles R2 delete failure gracefully", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/groveauth.sql",
				database_name: "groveauth",
				backup_date: "2026-01-01",
				size_bytes: 1024,
			},
		];

		mockBucket.delete.mockRejectedValueOnce(new Error("R2 connection failed"));

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.totalExpired).toBe(1);
		expect(result.deleted).toBe(0);
		expect(result.failed).toBe(1);
		expect(result.freedBytes).toBe(0);
		expect(result.results[0].success).toBe(false);
		expect(result.results[0].error).toBe("R2 connection failed");
	});

	it("handles multiple expired backups", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/groveauth.sql",
				database_name: "groveauth",
				backup_date: "2026-01-01",
				size_bytes: 1024,
			},
			{
				id: 2,
				r2_key: "2026-01-02/grove-engine.sql",
				database_name: "grove-engine",
				backup_date: "2026-01-02",
				size_bytes: 2048,
			},
			{
				id: 3,
				r2_key: "2026-01-03/scout.sql",
				database_name: "scout",
				backup_date: "2026-01-03",
				size_bytes: 512,
			},
		];

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			} else if (sql.includes("UPDATE backup_inventory")) {
				stmt.run.mockResolvedValueOnce({});
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.totalExpired).toBe(3);
		expect(result.deleted).toBe(3);
		expect(result.failed).toBe(0);
		expect(result.freedBytes).toBe(3584); // 1024 + 2048 + 512

		// Verify all three backups were processed
		expect(mockBucket.delete).toHaveBeenCalledTimes(3);
		expect(mockBucket.delete).toHaveBeenCalledWith("2026-01-01/groveauth.sql");
		expect(mockBucket.delete).toHaveBeenCalledWith("2026-01-02/grove-engine.sql");
		expect(mockBucket.delete).toHaveBeenCalledWith("2026-01-03/scout.sql");
	});

	it("includes success entries in results array", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/groveauth.sql",
				database_name: "groveauth",
				backup_date: "2026-01-01",
				size_bytes: 1024,
			},
		];

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			} else if (sql.includes("UPDATE backup_inventory")) {
				stmt.run.mockResolvedValueOnce({});
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.results).toHaveLength(1);
		expect(result.results[0]).toEqual({
			key: "2026-01-01/groveauth.sql",
			success: true,
		});
		expect(result.results[0]).not.toHaveProperty("error");
	});

	it("includes failure entries in results array with error message", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/groveauth.sql",
				database_name: "groveauth",
				backup_date: "2026-01-01",
				size_bytes: 1024,
			},
		];

		mockBucket.delete.mockRejectedValueOnce(new Error("Permission denied accessing R2"));

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.results).toHaveLength(1);
		expect(result.results[0]).toEqual({
			key: "2026-01-01/groveauth.sql",
			success: false,
			error: "Permission denied accessing R2",
		});
	});

	it("continues processing after partial failures", async () => {
		const expiredBackups = [
			{
				id: 1,
				r2_key: "2026-01-01/db1.sql",
				database_name: "db1",
				backup_date: "2026-01-01",
				size_bytes: 1000,
			},
			{
				id: 2,
				r2_key: "2026-01-02/db2.sql",
				database_name: "db2",
				backup_date: "2026-01-02",
				size_bytes: 2000,
			},
			{
				id: 3,
				r2_key: "2026-01-03/db3.sql",
				database_name: "db3",
				backup_date: "2026-01-03",
				size_bytes: 3000,
			},
		];

		// First delete succeeds, second fails, third succeeds
		mockBucket.delete
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("Transient error"))
			.mockResolvedValueOnce(undefined);

		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: expiredBackups });
			} else if (sql.includes("UPDATE backup_inventory")) {
				stmt.run.mockResolvedValueOnce({});
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result.totalExpired).toBe(3);
		expect(result.deleted).toBe(2);
		expect(result.failed).toBe(1);
		expect(result.freedBytes).toBe(4000); // 1000 + 3000, excluding failed backup
		expect(result.results).toHaveLength(3);
		expect(result.results[0].success).toBe(true);
		expect(result.results[1].success).toBe(false);
		expect(result.results[2].success).toBe(true);
	});

	it("binds correct timestamp parameter to query", async () => {
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: [] });
			}
			return stmt;
		});

		await cleanupOldBackups(mockBucket, mockDb, 4);

		// Verify bind was called with the mocked timestamp
		expect(mockDb._boundStatement.bind).toHaveBeenCalledWith(1710000000);
	});

	it("returns result with correct structure", async () => {
		mockDb.prepare.mockImplementation((sql: string) => {
			const stmt = mockDb._boundStatement;
			if (sql.includes("SELECT id, r2_key")) {
				stmt.all.mockResolvedValueOnce({ results: [] });
			}
			return stmt;
		});

		const result = await cleanupOldBackups(mockBucket, mockDb, 4);

		expect(result).toHaveProperty("totalExpired");
		expect(result).toHaveProperty("deleted");
		expect(result).toHaveProperty("failed");
		expect(result).toHaveProperty("freedBytes");
		expect(result).toHaveProperty("results");

		expect(typeof result.totalExpired).toBe("number");
		expect(typeof result.deleted).toBe("number");
		expect(typeof result.failed).toBe("number");
		expect(typeof result.freedBytes).toBe("number");
		expect(Array.isArray(result.results)).toBe(true);
	});
});
