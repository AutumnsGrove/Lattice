/**
 * Reactions Service Tests
 *
 * Tests addReaction, removeReaction, emoji validation,
 * and the denormalized reaction_counts rebuild.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { addReaction, removeReaction } from "./reactions";
import { createMockD1, type MockD1 } from "./test-helpers";

vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-reaction" });

describe("addReaction", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should insert reaction and update counts", async () => {
		// INSERT succeeds
		db._pushResult({ meta: { changes: 1 } });
		// SELECT emoji counts
		db._pushResult({ results: [{ emoji: "❤️", count: 1 }], meta: { changes: 0 } });
		// UPDATE reaction_counts
		db._pushResult({ meta: { changes: 1 } });

		const result = await addReaction(db as unknown as D1Database, "user-1", "post-1", "❤️");

		expect(result).toBe(true);
		expect(db._calls).toHaveLength(3);
		expect(db._calls[0].sql).toContain("INSERT INTO meadow_reactions");
		expect(db._calls[0].bindings).toEqual(["mock-uuid-reaction", "user-1", "post-1", "❤️"]);
	});

	it("should reject invalid emoji", async () => {
		await expect(
			addReaction(db as unknown as D1Database, "user-1", "post-1", "👎"),
		).rejects.toThrow("MEADOW-020");
	});

	it("should return false on duplicate reaction", async () => {
		db._pushError(new Error("UNIQUE constraint failed"));

		const result = await addReaction(db as unknown as D1Database, "user-1", "post-1", "❤️");

		expect(result).toBe(false);
	});

	it("should re-throw non-UNIQUE errors", async () => {
		db._pushError(new Error("DB failure"));

		await expect(
			addReaction(db as unknown as D1Database, "user-1", "post-1", "❤️"),
		).rejects.toThrow("DB failure");
	});

	it("should rebuild counts as JSON after insert", async () => {
		// INSERT
		db._pushResult({ meta: { changes: 1 } });
		// SELECT counts — multiple emojis
		db._pushResult({
			results: [
				{ emoji: "❤️", count: 3 },
				{ emoji: "✨", count: 2 },
			],
			meta: { changes: 0 },
		});
		// UPDATE
		db._pushResult({ meta: { changes: 1 } });

		await addReaction(db as unknown as D1Database, "user-1", "post-1", "❤️");

		// The UPDATE should contain serialized JSON counts
		const updateCall = db._calls[2];
		expect(updateCall.sql).toContain("UPDATE meadow_posts SET reaction_counts");
		const serialized = updateCall.bindings[0] as string;
		expect(JSON.parse(serialized)).toEqual({ "❤️": 3, "✨": 2 });
	});
});

describe("removeReaction", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should delete reaction and update counts when it exists", async () => {
		// DELETE returns 1 change
		db._pushResult({ meta: { changes: 1 } });
		// SELECT counts (empty after removal)
		db._pushResult({ results: [], meta: { changes: 0 } });
		// UPDATE
		db._pushResult({ meta: { changes: 1 } });

		const result = await removeReaction(db as unknown as D1Database, "user-1", "post-1", "❤️");

		expect(result).toBe(true);
		expect(db._calls).toHaveLength(3);
		expect(db._calls[0].sql).toContain("DELETE FROM meadow_reactions");
	});

	it("should return false when reaction doesn't exist", async () => {
		db._pushResult({ meta: { changes: 0 } });

		const result = await removeReaction(db as unknown as D1Database, "user-1", "post-1", "❤️");

		expect(result).toBe(false);
		expect(db._calls).toHaveLength(1);
	});
});
