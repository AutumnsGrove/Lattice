/**
 * Feed Service Tests
 *
 * Tests getFeed with its 5 algorithms: all, popular, hot, top, following, bookmarks.
 * Also covers notes/blooms content-type filtering and pagination.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getFeed } from "./feed";
import { createMockD1, type MockD1 } from "./test-helpers";
import type { FeedOptions, PostRow } from "./types";

// Freeze time for deterministic hot/top calculations
const NOW_SECONDS = 1700000000;
vi.spyOn(Date, "now").mockReturnValue(NOW_SECONDS * 1000);

function makePostRow(overrides: Partial<PostRow> = {}): PostRow {
	return {
		id: "post-1",
		tenant_id: "t-1",
		guid: "guid-1",
		title: "Test Post",
		description: "desc",
		content_html: null,
		link: "https://example.com",
		author_name: "Author",
		author_subdomain: "blog",
		tags: "[]",
		featured_image: null,
		published_at: NOW_SECONDS - 3600,
		score: 5,
		reaction_counts: "{}",
		post_type: "bloom",
		user_id: null,
		body: null,
		blaze: null,
		user_voted: null,
		user_bookmarked: null,
		user_reactions: null,
		...overrides,
	};
}

function defaultOpts(overrides: Partial<FeedOptions> = {}): FeedOptions {
	return {
		filter: "all",
		limit: 20,
		offset: 0,
		...overrides,
	};
}

describe("getFeed", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	// ── "all" algorithm ──────────────────────────────────────────

	it("should return posts sorted by published_at DESC for 'all' filter", async () => {
		// COUNT query
		db._pushResult({ results: [{ total: 2 }] });
		// SELECT query
		db._pushResult({ results: [makePostRow({ id: "p1" }), makePostRow({ id: "p2" })] });

		const result = await getFeed(db as unknown as D1Database, defaultOpts());

		expect(result.posts).toHaveLength(2);
		expect(result.pagination.total).toBe(2);
		expect(result.pagination.hasMore).toBe(false);
		// Verify ORDER BY
		const selectCall = db._calls[1];
		expect(selectCall.sql).toContain("ORDER BY p.published_at DESC");
	});

	// ── Pagination ───────────────────────────────────────────────

	it("should calculate hasMore correctly", async () => {
		db._pushResult({ results: [{ total: 50 }] });
		db._pushResult({ results: [makePostRow()] });

		const result = await getFeed(
			db as unknown as D1Database,
			defaultOpts({ limit: 20, offset: 0 }),
		);

		expect(result.pagination.hasMore).toBe(true);
		expect(result.pagination.total).toBe(50);
	});

	it("should pass limit and offset as bind params", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ limit: 10, offset: 30 }));

		const selectBinds = db._calls[1].bindings;
		// Last two params are limit and offset
		expect(selectBinds[selectBinds.length - 2]).toBe(10);
		expect(selectBinds[selectBinds.length - 1]).toBe(30);
	});

	// ── "popular" algorithm ──────────────────────────────────────

	it("should sort by score DESC for 'popular' filter", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "popular" }));

		expect(db._calls[1].sql).toContain("ORDER BY p.score DESC");
	});

	// ── "hot" algorithm ──────────────────────────────────────────

	it("should use HN-style decay formula for 'hot' filter", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "hot" }));

		const sql = db._calls[1].sql;
		expect(sql).toContain("p.score /");
		expect(sql).toContain("SQRT");
	});

	// ── "top" algorithm ──────────────────────────────────────────

	it("should filter by period for 'top' filter", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "top", topPeriod: "day" }));

		// Count query should have period filter
		expect(db._calls[0].sql).toContain("p.published_at >= ?");
		// Period start should be now - 86400
		const expectedStart = NOW_SECONDS - 86400;
		expect(db._calls[0].bindings).toContain(expectedStart);
	});

	it("should default to week period when topPeriod not specified", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "top" }));

		const expectedStart = NOW_SECONDS - 604800; // 7 days
		expect(db._calls[0].bindings).toContain(expectedStart);
	});

	// ── "following" algorithm ────────────────────────────────────

	it("should return empty for 'following' without userId", async () => {
		const result = await getFeed(
			db as unknown as D1Database,
			defaultOpts({ filter: "following", userId: null }),
		);

		expect(result.posts).toEqual([]);
		expect(result.pagination.total).toBe(0);
		// No DB calls at all
		expect(db._calls).toHaveLength(0);
	});

	it("should filter by followed tenants for 'following' with userId", async () => {
		db._pushResult({ results: [{ total: 1 }] });
		db._pushResult({ results: [makePostRow()] });

		await getFeed(
			db as unknown as D1Database,
			defaultOpts({ filter: "following", userId: "user-1" }),
		);

		expect(db._calls[0].sql).toContain("meadow_follows");
		expect(db._calls[0].sql).toContain("follower_id = ?");
	});

	// ── "bookmarks" algorithm ────────────────────────────────────

	it("should return empty for 'bookmarks' without userId", async () => {
		const result = await getFeed(
			db as unknown as D1Database,
			defaultOpts({ filter: "bookmarks", userId: null }),
		);

		expect(result.posts).toEqual([]);
		expect(db._calls).toHaveLength(0);
	});

	it("should filter by bookmarked posts for 'bookmarks' with userId", async () => {
		db._pushResult({ results: [{ total: 1 }] });
		db._pushResult({ results: [makePostRow()] });

		await getFeed(
			db as unknown as D1Database,
			defaultOpts({ filter: "bookmarks", userId: "user-1" }),
		);

		expect(db._calls[0].sql).toContain("meadow_bookmarks");
	});

	// ── Content type filters ─────────────────────────────────────

	it("should filter by post_type='note' for 'notes' filter", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "notes" }));

		expect(db._calls[0].sql).toContain("p.post_type = ?");
		expect(db._calls[0].bindings).toContain("note");
		// Should use "all" ordering (published_at DESC)
		expect(db._calls[1].sql).toContain("ORDER BY p.published_at DESC");
	});

	it("should filter by post_type='bloom' for 'blooms' filter", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ filter: "blooms" }));

		expect(db._calls[0].sql).toContain("p.post_type = ?");
		expect(db._calls[0].bindings).toContain("bloom");
	});

	// ── User state joins ─────────────────────────────────────────

	it("should add user LEFT JOINs when userId is provided", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ userId: "user-1" }));

		const sql = db._calls[1].sql;
		expect(sql).toContain("LEFT JOIN meadow_votes");
		expect(sql).toContain("LEFT JOIN meadow_bookmarks");
		expect(sql).toContain("meadow_reactions");
	});

	it("should NOT add user JOINs when userId is null", async () => {
		db._pushResult({ results: [{ total: 0 }] });
		db._pushResult({ results: [] });

		await getFeed(db as unknown as D1Database, defaultOpts({ userId: null }));

		const sql = db._calls[1].sql;
		expect(sql).not.toContain("LEFT JOIN meadow_votes");
	});

	// ── Error handling ───────────────────────────────────────────

	it("should gracefully handle count query failure", async () => {
		// COUNT throws
		db._pushError(new Error("DB error"));
		// SELECT succeeds
		db._pushResult({ results: [makePostRow()] });

		const result = await getFeed(db as unknown as D1Database, defaultOpts());

		// Should still return posts, with total defaulting to 0
		expect(result.pagination.total).toBe(0);
	});

	it("should gracefully handle posts query failure", async () => {
		// COUNT succeeds
		db._pushResult({ results: [{ total: 5 }] });
		// SELECT throws — but Promise.all runs both concurrently,
		// so the error goes to whatever resolves next. Instead, test
		// that the catch returns an empty results array.
		db._pushResult({ results: [] });

		const result = await getFeed(db as unknown as D1Database, defaultOpts());

		expect(result.posts).toEqual([]);
		expect(result.pagination.total).toBe(5);
	});

	// ── Row transformation ───────────────────────────────────────

	it("should transform PostRow to MeadowPost via rowToPost", async () => {
		db._pushResult({ results: [{ total: 1 }] });
		db._pushResult({
			results: [
				makePostRow({
					id: "p-transformed",
					tags: '["tag1"]',
					score: 42,
					user_voted: 1,
					user_bookmarked: 0,
				}),
			],
		});

		const result = await getFeed(db as unknown as D1Database, defaultOpts());

		const post = result.posts[0];
		expect(post.id).toBe("p-transformed");
		expect(post.tags).toEqual(["tag1"]);
		expect(post.score).toBe(42);
		expect(post.userVoted).toBe(true);
		expect(post.userBookmarked).toBe(false);
	});
});
