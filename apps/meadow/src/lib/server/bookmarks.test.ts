/**
 * Bookmarks Service Tests
 *
 * Tests the toggle pattern: DELETE first, INSERT if nothing removed.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { toggleBookmark } from "./bookmarks";
import { createMockD1, type MockD1 } from "./test-helpers";

vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-bookmark" });

describe("toggleBookmark", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should create bookmark when none exists (returns true)", async () => {
		// DELETE finds nothing
		db._pushResult({ meta: { changes: 0 } });
		// INSERT succeeds
		db._pushResult({ meta: { changes: 1 } });

		const result = await toggleBookmark(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(true);
		expect(db._calls).toHaveLength(2);
		expect(db._calls[0].sql).toContain("DELETE FROM meadow_bookmarks");
		expect(db._calls[1].sql).toContain("INSERT INTO meadow_bookmarks");
		expect(db._calls[1].bindings).toEqual(["mock-uuid-bookmark", "user-1", "post-1"]);
	});

	it("should remove bookmark when it exists (returns false)", async () => {
		// DELETE removes 1 row
		db._pushResult({ meta: { changes: 1 } });

		const result = await toggleBookmark(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(false);
		// Should NOT insert
		expect(db._calls).toHaveLength(1);
	});

	it("should pass correct userId and postId to DELETE", async () => {
		db._pushResult({ meta: { changes: 1 } });

		await toggleBookmark(db as unknown as D1Database, "user-42", "post-99");

		expect(db._calls[0].bindings).toEqual(["user-42", "post-99"]);
	});
});
