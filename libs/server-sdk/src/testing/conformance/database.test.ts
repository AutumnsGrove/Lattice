/**
 * Conformance tests for GroveDatabase interface.
 *
 * Any implementation of GroveDatabase must pass these tests.
 * Currently validates the MockDatabase implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDatabase } from "../mock-database.js";

describe("GroveDatabase conformance", () => {
	let db: MockDatabase;

	beforeEach(() => {
		db = new MockDatabase();
	});

	describe("execute", () => {
		it("should execute a query and return results", async () => {
			db.whenQuery("SELECT", [{ id: 1, title: "Hello" }]);

			const result = await db.execute("SELECT * FROM posts");
			expect(result.results).toHaveLength(1);
			expect(result.results[0]).toEqual({ id: 1, title: "Hello" });
		});

		it("should return empty results for unmatched queries", async () => {
			const result = await db.execute("INSERT INTO posts VALUES (1)");
			expect(result.results).toHaveLength(0);
		});

		it("should record query calls", async () => {
			await db.execute("SELECT * FROM posts WHERE id = ?", [42]);
			expect(db.calls).toHaveLength(1);
			expect(db.calls[0]!.sql).toBe("SELECT * FROM posts WHERE id = ?");
			expect(db.calls[0]!.params).toEqual([42]);
		});

		it("should return valid meta", async () => {
			const result = await db.execute("SELECT 1");
			expect(result.meta).toBeDefined();
			expect(typeof result.meta.changes).toBe("number");
			expect(typeof result.meta.duration).toBe("number");
		});
	});

	describe("prepare/bind", () => {
		it("should prepare and bind a statement", async () => {
			db.whenQuery("SELECT", [{ id: 1 }]);

			const stmt = db.prepare("SELECT * FROM posts WHERE id = ?");
			const bound = stmt.bind(1);
			const result = await bound.first();
			expect(result).toEqual({ id: 1 });
		});

		it("should return null from first() when no results", async () => {
			const stmt = db.prepare("SELECT * FROM posts WHERE id = ?");
			const bound = stmt.bind(999);
			const result = await bound.first();
			expect(result).toBeNull();
		});

		it("should return results from all()", async () => {
			db.whenQuery("SELECT", [{ id: 1 }, { id: 2 }]);

			const stmt = db.prepare("SELECT * FROM posts");
			const bound = stmt.bind();
			const result = await bound.all();
			expect(result.results).toHaveLength(2);
		});

		it("should return meta from run()", async () => {
			const stmt = db.prepare("INSERT INTO posts VALUES (?)");
			const bound = stmt.bind("test");
			const meta = await bound.run();
			expect(meta).toBeDefined();
			expect(typeof meta.changes).toBe("number");
		});
	});

	describe("transaction", () => {
		it("should execute a function inside a mock transaction", async () => {
			db.whenQuery("INSERT", []);

			const result = await db.transaction(async (tx) => {
				await tx.execute("INSERT INTO posts VALUES (?)", ["test"]);
				return "done";
			});

			expect(result).toBe("done");
			expect(db.calls).toHaveLength(1);
		});
	});

	describe("info", () => {
		it("should return provider info", () => {
			const info = db.info();
			expect(info.provider).toBe("mock");
			expect(info.database).toBe("test");
			expect(info.readonly).toBe(false);
		});
	});

	describe("reset", () => {
		it("should clear all calls and responses", async () => {
			db.whenQuery("SELECT", [{ id: 1 }]);
			await db.execute("SELECT 1");
			expect(db.calls).toHaveLength(1);

			db.reset();
			expect(db.calls).toHaveLength(0);

			const result = await db.execute("SELECT 1");
			expect(result.results).toHaveLength(0);
		});
	});
});
