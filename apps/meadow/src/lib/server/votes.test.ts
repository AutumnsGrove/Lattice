/**
 * Votes Service Tests
 *
 * Tests castVote, removeVote, and the denormalized score recount.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { castVote, removeVote } from "./votes";
import { createMockD1, type MockD1 } from "./test-helpers";

// Mock crypto.randomUUID for deterministic IDs
vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-vote" });

describe("castVote", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should insert a vote and update score", async () => {
		// INSERT succeeds
		db._pushResult({ meta: { changes: 1 } });
		// UPDATE score succeeds
		db._pushResult({ meta: { changes: 1 } });

		const result = await castVote(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(true);
		expect(db._calls).toHaveLength(2);
		expect(db._calls[0].sql).toContain("INSERT INTO meadow_votes");
		expect(db._calls[0].bindings).toEqual(["mock-uuid-vote", "user-1", "post-1"]);
		expect(db._calls[1].sql).toContain("UPDATE meadow_posts");
		expect(db._calls[1].sql).toContain("SELECT COUNT(*)");
	});

	it("should return false on duplicate vote (UNIQUE constraint)", async () => {
		db._pushError(
			new Error("UNIQUE constraint failed: meadow_votes.user_id, meadow_votes.post_id"),
		);

		const result = await castVote(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(false);
		// Should NOT have called updatePostScore
		expect(db._calls).toHaveLength(1);
	});

	it("should re-throw non-UNIQUE errors", async () => {
		db._pushError(new Error("DB connection lost"));

		await expect(castVote(db as unknown as D1Database, "user-1", "post-1")).rejects.toThrow(
			"DB connection lost",
		);
	});
});

describe("removeVote", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should delete vote and update score when vote exists", async () => {
		// DELETE returns 1 change
		db._pushResult({ meta: { changes: 1 } });
		// UPDATE score
		db._pushResult({ meta: { changes: 1 } });

		const result = await removeVote(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(true);
		expect(db._calls).toHaveLength(2);
		expect(db._calls[0].sql).toContain("DELETE FROM meadow_votes");
		expect(db._calls[0].bindings).toEqual(["user-1", "post-1"]);
	});

	it("should return false when no vote to remove", async () => {
		db._pushResult({ meta: { changes: 0 } });

		const result = await removeVote(db as unknown as D1Database, "user-1", "post-1");

		expect(result).toBe(false);
		// Should NOT call updatePostScore
		expect(db._calls).toHaveLength(1);
	});
});
