/**
 * PostMetaDO Tests
 *
 * Tests per-post hot data: view counts, reactions, presence, popularity.
 * Covers initialization, view dedup, reaction management, and popularity calculation.
 */

import { describe, it, expect, vi } from "vitest";
import { PostMetaDO, type PostMeta, type ReactionCounts } from "./PostMetaDO";
import {
	createTestDOState,
	createMockSql,
	doRequest,
	doPost,
	doDelete,
	waitForInit,
} from "./test-helpers";

// Sample meta state for testing
const sampleMeta: PostMeta = {
	tenantId: "tenant-1",
	slug: "hello-world",
	tier: "seedling",
	viewCount: 10,
	reactions: { likes: 3, bookmarks: 1 },
	lastViewed: Date.now(),
	isPopular: false,
};

/**
 * Factory: creates a PostMetaDO with async init completed.
 * Pushes loadState result BEFORE construction so the init
 * in the constructor picks it up correctly.
 */
async function createPostMetaDO(initialState: PostMeta | null = null) {
	const sql = createMockSql();
	const { state } = createTestDOState("post:tenant-1:hello-world", sql);

	// Push loadState result before construction
	if (initialState) {
		sql._pushResult({ value: JSON.stringify(initialState) });
	} else {
		sql._pushResult(null);
	}

	const doInstance = new PostMetaDO(state, { DB: {} as D1Database });
	await waitForInit();
	return { doInstance, sql };
}

describe("PostMetaDO", () => {
	// ════════════════════════════════════════════════════════════════════
	// GET /meta
	// ════════════════════════════════════════════════════════════════════

	describe("GET /meta", () => {
		it("should return 404 when post not initialized", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(doRequest("/meta"));

			expect(res.status).toBe(404);
			expect(await res.text()).toContain("not initialized");
		});

		it("should return meta when initialized", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(doRequest("/meta"));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.tenantId).toBe("tenant-1");
			expect(body.slug).toBe("hello-world");
			expect(body.viewCount).toBe(10);
			expect(body.reactions.likes).toBe(3);
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// POST /meta/init
	// ════════════════════════════════════════════════════════════════════

	describe("POST /meta/init", () => {
		it("should initialize new post meta", async () => {
			const { doInstance, sql } = await createPostMetaDO(null);
			// persistMeta: INSERT OR REPLACE
			sql._pushResult({});

			const res = await doInstance.fetch(
				doPost("/meta/init", {
					tenantId: "tenant-1",
					slug: "hello-world",
					tier: "seedling",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.meta.tenantId).toBe("tenant-1");
			expect(body.meta.slug).toBe("hello-world");
			expect(body.meta.tier).toBe("seedling");
			expect(body.meta.viewCount).toBe(0);
			expect(body.meta.reactions).toEqual({ likes: 0, bookmarks: 0 });
		});

		it("should reject missing tenantId", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(
				doPost("/meta/init", { slug: "hello-world", tier: "seedling" }),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("Missing tenantId or slug");
		});

		it("should reject missing slug", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(
				doPost("/meta/init", { tenantId: "tenant-1", tier: "seedling" }),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("Missing tenantId or slug");
		});

		it("should not reinitialize existing post", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(
				doPost("/meta/init", {
					tenantId: "tenant-1",
					slug: "hello-world",
					tier: "seedling",
				}),
			);

			// Should succeed but not insert again
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.meta.viewCount).toBe(10); // Original value preserved
		});

		it("should update tier if changed", async () => {
			const oldMeta: PostMeta = { ...sampleMeta, tier: "sapling" };
			const { doInstance, sql } = await createPostMetaDO(oldMeta);

			// updatePopularStatus: SELECT COUNT(*) for daily views
			sql._pushResult({ count: 80 });
			// persistMeta: INSERT OR REPLACE
			sql._pushResult({});

			const res = await doInstance.fetch(
				doPost("/meta/init", {
					tenantId: "tenant-1",
					slug: "hello-world",
					tier: "seedling", // Changed to seedling
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.meta.tier).toBe("seedling");
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// POST /view
	// ════════════════════════════════════════════════════════════════════

	describe("POST /view", () => {
		it("should record view and increment viewCount", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// INSERT INTO view_log
			sql._pushResult({});
			// updatePopularStatus: SELECT COUNT(*)
			sql._pushResult({ count: 50 });
			// persistIfDirty: INSERT OR REPLACE into meta
			sql._pushResult({});

			const res = await doInstance.fetch(doPost("/view", { sessionId: "session-1" }));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.viewCount).toBe(11); // 10 + 1
		});

		it("should deduplicate views within 5 minute window", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// First view from session-2
			sql._pushResult({});
			sql._pushResult({ count: 50 });
			sql._pushResult({});

			let res = await doInstance.fetch(doPost("/view", { sessionId: "session-2" }));
			expect(res.status).toBe(200);
			let body = await res.json();
			expect(body.viewCount).toBe(11);

			// Second view from same session within 5 min — should be dedup'd
			res = await doInstance.fetch(doPost("/view", { sessionId: "session-2" }));
			expect(res.status).toBe(200);
			body = await res.json();
			// Should still be 11 (not incremented)
			expect(body.viewCount).toBe(11);
		});

		it("should return 400 when post not initialized", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(doPost("/view", { sessionId: "session-1" }));

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("not initialized");
		});

		it("should use anonymous session ID when not provided", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			sql._pushResult({});
			sql._pushResult({ count: 50 });
			sql._pushResult({});

			const res = await doInstance.fetch(doPost("/view", {}));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.viewCount).toBe(11);
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// GET /reactions
	// ════════════════════════════════════════════════════════════════════

	describe("GET /reactions", () => {
		it("should return reaction counts when initialized", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(doRequest("/reactions"));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.likes).toBe(3);
			expect(body.bookmarks).toBe(1);
		});

		it("should return 404 when not initialized", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(doRequest("/reactions"));

			expect(res.status).toBe(404);
			expect(await res.text()).toContain("not initialized");
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// POST /reactions
	// ════════════════════════════════════════════════════════════════════

	describe("POST /reactions", () => {
		it("should add like reaction", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// SELECT 1 FROM reactions WHERE... — no existing like
			sql._pushResult(null);
			// INSERT INTO reactions
			sql._pushResult({});
			// updatePopularStatus: SELECT COUNT(*)
			sql._pushResult({ count: 50 });
			// persistMeta: INSERT OR REPLACE
			sql._pushResult({});

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "like",
					userId: "user-1",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.reactions.likes).toBe(4); // 3 + 1
			expect(body.reactions.bookmarks).toBe(1);
		});

		it("should add bookmark reaction", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// SELECT 1 FROM reactions — no existing bookmark
			sql._pushResult(null);
			// INSERT INTO reactions
			sql._pushResult({});
			// updatePopularStatus
			sql._pushResult({ count: 50 });
			// persistMeta
			sql._pushResult({});

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "bookmark",
					userId: "user-1",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.reactions.likes).toBe(3);
			expect(body.reactions.bookmarks).toBe(2); // 1 + 1
		});

		it("should reject duplicate reaction", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// SELECT 1 FROM reactions — existing like found
			sql._pushResult({ "1": 1 });

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "like",
					userId: "user-1",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Already reacted");
			expect(body.reactions.likes).toBe(3); // Unchanged
		});

		it("should reject invalid reaction type", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "love", // Invalid
					userId: "user-1",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("Invalid reaction type");
		});

		it("should return 400 when post not initialized", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "like",
					userId: "user-1",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("not initialized");
		});

		it("should use anonymous user ID when not provided", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			sql._pushResult(null);
			sql._pushResult({});
			sql._pushResult({ count: 50 });
			sql._pushResult({});

			const res = await doInstance.fetch(
				doPost("/reactions", {
					type: "like",
					timestamp: Date.now(),
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// DELETE /reactions
	// ════════════════════════════════════════════════════════════════════

	describe("DELETE /reactions", () => {
		it("should remove like reaction", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// DELETE FROM reactions
			sql._pushResult({});
			// persistMeta: INSERT OR REPLACE
			sql._pushResult({});

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "like",
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.reactions.likes).toBe(2); // 3 - 1
			expect(body.reactions.bookmarks).toBe(1);
		});

		it("should remove bookmark reaction", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// DELETE FROM reactions
			sql._pushResult({});
			// persistMeta
			sql._pushResult({});

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "bookmark",
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.reactions.likes).toBe(3);
			expect(body.reactions.bookmarks).toBe(0); // 1 - 1
		});

		it("should not go below 0 for likes", async () => {
			const emptyReactionsMeta: PostMeta = { ...sampleMeta, reactions: { likes: 0, bookmarks: 0 } };
			const { doInstance, sql } = await createPostMetaDO(emptyReactionsMeta);

			// DELETE FROM reactions (no-op if doesn't exist)
			sql._pushResult({});
			// persistMeta
			sql._pushResult({});

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "like",
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.reactions.likes).toBe(0); // Stays at 0, not -1
		});

		it("should not go below 0 for bookmarks", async () => {
			const emptyReactionsMeta: PostMeta = { ...sampleMeta, reactions: { likes: 0, bookmarks: 0 } };
			const { doInstance, sql } = await createPostMetaDO(emptyReactionsMeta);

			// DELETE FROM reactions
			sql._pushResult({});
			// persistMeta
			sql._pushResult({});

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "bookmark",
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.reactions.bookmarks).toBe(0); // Stays at 0
		});

		it("should reject invalid reaction type", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "dislike", // Invalid
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("Invalid reaction type");
		});

		it("should return 400 when post not initialized", async () => {
			const { doInstance } = await createPostMetaDO(null);

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "like",
					userId: "user-1",
				}),
			);

			expect(res.status).toBe(400);
			expect(await res.text()).toContain("not initialized");
		});

		it("should use anonymous user ID when not provided", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			sql._pushResult({});
			sql._pushResult({});

			const res = await doInstance.fetch(
				doDelete("/reactions", {
					type: "like",
				}),
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// GET /presence
	// ════════════════════════════════════════════════════════════════════

	describe("GET /presence", () => {
		it("should return active reader count", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// Record a view to populate presence
			sql._pushResult({});
			sql._pushResult({ count: 50 });
			sql._pushResult({});

			// Record view first to add to presence
			await doInstance.fetch(doPost("/view", { sessionId: "session-1" }));

			// Now get presence
			const res = await doInstance.fetch(doRequest("/presence"));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.activeReaders).toBe(1);
			expect(body.lastActivity).toBeGreaterThan(0);
		});

		it("should return 0 when no active readers", async () => {
			const { doInstance } = await createPostMetaDO(sampleMeta);

			const res = await doInstance.fetch(doRequest("/presence"));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.activeReaders).toBe(0);
			expect(body.lastActivity).toBe(0);
		});

		it("should clean up stale presence entries", async () => {
			const { doInstance, sql } = await createPostMetaDO(sampleMeta);

			// Record first view
			sql._pushResult({});
			sql._pushResult({ count: 50 });
			sql._pushResult({});

			await doInstance.fetch(doPost("/view", { sessionId: "session-old" }));

			// Mock Date.now to be far in future (past presence timeout)
			const futureTime = Date.now() + 6 * 60 * 1000; // 6 minutes later
			vi.spyOn(Date, "now").mockReturnValue(futureTime);

			const res = await doInstance.fetch(doRequest("/presence"));

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.activeReaders).toBe(0); // Old session cleaned up

			vi.restoreAllMocks();
		});
	});

	// ════════════════════════════════════════════════════════════════════
	// Route matching
	// ════════════════════════════════════════════════════════════════════

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = await createPostMetaDO(null);
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});

		it("should return 404 for wrong method", async () => {
			const { doInstance } = await createPostMetaDO(null);
			const res = await doInstance.fetch(doRequest("/meta", { method: "DELETE" }));
			expect(res.status).toBe(404);
		});
	});
});
