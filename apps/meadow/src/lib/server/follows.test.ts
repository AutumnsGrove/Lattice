/**
 * Follows Service Tests
 *
 * Tests followBlog, unfollowBlog, getFollowing — powers the "Following" feed tab.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { followBlog, unfollowBlog, getFollowing } from "./follows";
import { createMockD1, type MockD1 } from "./test-helpers";

vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-follow" });

describe("followBlog", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should insert follow and return true", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await followBlog(db as unknown as D1Database, "user-1", "tenant-1");

		expect(result).toBe(true);
		expect(db._calls[0].sql).toContain("INSERT INTO meadow_follows");
		expect(db._calls[0].bindings).toEqual(["mock-uuid-follow", "user-1", "tenant-1"]);
	});

	it("should return false on duplicate follow", async () => {
		db._pushError(new Error("UNIQUE constraint failed"));

		const result = await followBlog(db as unknown as D1Database, "user-1", "tenant-1");

		expect(result).toBe(false);
	});

	it("should re-throw non-UNIQUE errors", async () => {
		db._pushError(new Error("Network error"));

		await expect(followBlog(db as unknown as D1Database, "user-1", "tenant-1")).rejects.toThrow(
			"Network error",
		);
	});
});

describe("unfollowBlog", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should return true when follow existed", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await unfollowBlog(db as unknown as D1Database, "user-1", "tenant-1");

		expect(result).toBe(true);
		expect(db._calls[0].sql).toContain("DELETE FROM meadow_follows");
		expect(db._calls[0].bindings).toEqual(["user-1", "tenant-1"]);
	});

	it("should return false when not following", async () => {
		db._pushResult({ meta: { changes: 0 } });

		const result = await unfollowBlog(db as unknown as D1Database, "user-1", "tenant-1");

		expect(result).toBe(false);
	});
});

describe("getFollowing", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should return list of followed tenant IDs", async () => {
		db._pushResult({
			results: [
				{ followed_tenant_id: "tenant-1" },
				{ followed_tenant_id: "tenant-2" },
				{ followed_tenant_id: "tenant-3" },
			],
		});

		const result = await getFollowing(db as unknown as D1Database, "user-1");

		expect(result).toEqual(["tenant-1", "tenant-2", "tenant-3"]);
		expect(db._calls[0].sql).toContain("SELECT followed_tenant_id");
		expect(db._calls[0].bindings).toEqual(["user-1"]);
	});

	it("should return empty array when following nobody", async () => {
		db._pushResult({ results: [] });

		const result = await getFollowing(db as unknown as D1Database, "user-1");

		expect(result).toEqual([]);
	});
});
