/**
 * Bloom Service Tests
 *
 * Business logic tests for blog post CRUD — including tier enforcement,
 * content validation, cache invalidation, and delete-with-404.
 *
 * The database module is mocked at the module boundary. `getTenantDb` returns
 * a mock TenantDb-shaped object; the free `queryOne` is mocked independently.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

/** Reusable mock TenantDb instance — methods are replaced per-test via mockResolvedValue */
const mockTenantDb = {
	queryOne: vi.fn(),
	count: vi.fn(),
	exists: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

vi.mock("@autumnsgrove/lattice/server/services/database", () => ({
	getTenantDb: vi.fn(() => mockTenantDb),
	queryOne: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/server/services/cache", () => ({
	del: vi.fn(),
}));

vi.mock("@autumnsgrove/grove-markdown", () => ({
	getPostBySlug: vi.fn(),
	renderMarkdown: vi.fn((md: string) => `<p>${md}</p>`),
}));

vi.mock("@autumnsgrove/lattice/utils/validation", () => ({
	sanitizeObject: vi.fn((v: unknown) => v),
}));

vi.mock("@autumnsgrove/lattice/auth/session", () => ({
	getVerifiedTenantId: vi.fn(),
}));

vi.mock("@autumnsgrove/thorn/hooks", () => ({
	moderatePublishedContent: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/server/activity-tracking", () => ({
	updateLastActivity: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/errors", () => ({
	API_ERRORS: {
		RESOURCE_NOT_FOUND: { code: "RESOURCE_NOT_FOUND", userMessage: "Not found" },
		POST_LIMIT_REACHED: { code: "POST_LIMIT_REACHED", userMessage: "Post limit reached" },
		MISSING_REQUIRED_FIELDS: {
			code: "MISSING_REQUIRED_FIELDS",
			userMessage: "Required fields missing",
		},
		VALIDATION_FAILED: { code: "VALIDATION_FAILED", userMessage: "Validation failed" },
		CONTENT_TOO_LARGE: { code: "CONTENT_TOO_LARGE", userMessage: "Content too large" },
		INVALID_REQUEST_BODY: { code: "INVALID_REQUEST_BODY", userMessage: "Invalid body" },
		INVALID_FILE: { code: "INVALID_FILE", userMessage: "Invalid file" },
	},
	throwGroveError: vi.fn((status: number, error: unknown, _scope: string) => {
		const err = new Error(
			String((error as Record<string, unknown>)?.code ?? "GROVE_ERROR"),
		) as Error & {
			status: number;
		};
		err.status = status;
		throw err;
	}),
}));

vi.mock("@autumnsgrove/lattice/platform/config/tiers", () => ({
	TIERS: {
		wanderer: { limits: { posts: 25 } },
		seedling: { limits: { posts: 100 } },
		sapling: { limits: { posts: Infinity } },
		oak: { limits: { posts: Infinity } },
		evergreen: { limits: { posts: Infinity } },
	},
	isValidTier: vi.fn((v: string) =>
		["wanderer", "seedling", "sapling", "oak", "evergreen"].includes(v),
	),
}));

vi.mock("@sveltejs/kit", () => ({
	isHttpError: vi.fn((e: unknown) => !!(e as Record<string, unknown>)?.status),
}));

import { getTenantDb, queryOne } from "@autumnsgrove/lattice/server/services/database";
import * as cache from "@autumnsgrove/lattice/server/services/cache";
import { getPostBySlug } from "@autumnsgrove/grove-markdown";
import { getPost, updatePost, deletePost, invalidatePostCaches } from "./bloom-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockDb = {} as D1Database;
const TENANT = "tenant-bloom";
const USER = "user-writer";
const SLUG = "my-first-post";

function makePlatformEnv(overrides: Record<string, unknown> = {}) {
	return {
		AI: undefined,
		OPENROUTER_API_KEY: undefined,
		CACHE_KV: undefined,
		...overrides,
	};
}

function makePostRecord(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		slug: SLUG,
		title: "My First Post",
		status: "published",
		published_at: 1700000000,
		markdown_content: "# Hello World\n\nContent here.",
		html_content: "<h1>Hello World</h1>",
		tags: '["intro"]',
		description: "An intro post",
		gutter_content: "[]",
		font: "default",
		updated_at: 1700000000,
		...overrides,
	};
}

// ── invalidatePostCaches ──────────────────────────────────────────────────────

describe("invalidatePostCaches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes both the post cache key and the list cache key", async () => {
		const kv = {} as KVNamespace;

		await invalidatePostCaches(kv, TENANT, SLUG);

		expect(cache.del).toHaveBeenCalledTimes(2);
		expect(cache.del).toHaveBeenCalledWith(kv, `garden:${TENANT}:${SLUG}`);
		expect(cache.del).toHaveBeenCalledWith(kv, `garden:list:${TENANT}`);
	});

	it("is a no-op when kv is undefined", async () => {
		await invalidatePostCaches(undefined, TENANT, SLUG);

		expect(cache.del).not.toHaveBeenCalled();
	});

	it("swallows cache errors silently", async () => {
		const kv = {} as KVNamespace;
		vi.mocked(cache.del).mockRejectedValueOnce(new Error("KV timeout"));

		// Should not throw
		await expect(invalidatePostCaches(kv, TENANT, SLUG)).resolves.toBeUndefined();
	});
});

// ── getPost ───────────────────────────────────────────────────────────────────

describe("getPost", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns a post from D1 with correct shape", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(makePostRecord());

		const result = await getPost(SLUG, TENANT, true, mockDb);

		expect(result.source).toBe("d1");
		expect(result.post.slug).toBe(SLUG);
		expect(result.post.title).toBe("My First Post");
		// Tags JSON string should be parsed to array
		expect(Array.isArray(result.post.tags)).toBe(true);
	});

	it("parses tags from JSON string into an array", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(makePostRecord({ tags: '["rust", "learning"]' }));

		const result = await getPost(SLUG, TENANT, true, mockDb);

		expect(result.post.tags).toEqual(["rust", "learning"]);
	});

	it("returns private cache-control for owner", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(makePostRecord());

		const result = await getPost(SLUG, TENANT, true /* isOwner */, mockDb);

		expect(result.cacheControl).toContain("private");
	});

	it("returns public cache-control for non-owner", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(makePostRecord());

		const result = await getPost(SLUG, TENANT, false /* isOwner */, mockDb);

		expect(result.cacheControl).toContain("public");
	});

	it("throws 404 when a non-owner requests a draft post", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(makePostRecord({ status: "draft" }));

		await expect(getPost(SLUG, TENANT, false, mockDb)).rejects.toMatchObject({ status: 404 });
	});

	it("falls back to filesystem when D1 returns null", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(null);
		vi.mocked(getPostBySlug).mockReturnValueOnce({
			slug: SLUG,
			title: "Filesystem Post",
			date: "2026-01-01",
			tags: ["meta"],
			description: "From disk",
			content: "<p>Hello</p>",
			headers: [],
		} as ReturnType<typeof getPostBySlug>);

		const result = await getPost(SLUG, TENANT, true, mockDb);

		expect(result.source).toBe("filesystem");
		expect(result.post.title).toBe("Filesystem Post");
	});

	it("throws 404 when post is missing from both D1 and filesystem", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(null);
		vi.mocked(getPostBySlug).mockReturnValueOnce(null);

		await expect(getPost(SLUG, TENANT, true, mockDb)).rejects.toMatchObject({ status: 404 });
	});

	it("returns filesystem post when no db is provided", async () => {
		vi.mocked(getPostBySlug).mockReturnValueOnce({
			slug: SLUG,
			title: "No DB Post",
			date: "2026-01-01",
			tags: [],
			description: "",
			content: "<p>Content</p>",
			headers: [],
		} as ReturnType<typeof getPostBySlug>);

		const result = await getPost(SLUG, TENANT, true /* no db arg */);

		expect(result.source).toBe("filesystem");
	});
});

// ── updatePost ────────────────────────────────────────────────────────────────

describe("updatePost", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: post exists in draft
		mockTenantDb.queryOne.mockResolvedValue(
			makePostRecord({ status: "draft", published_at: null }),
		);
		mockTenantDb.count.mockResolvedValue(0);
		mockTenantDb.update.mockResolvedValue(1);
		mockTenantDb.exists.mockResolvedValue(false);
		vi.mocked(queryOne).mockResolvedValue({ plan: "seedling" });
	});

	it("updates a draft post and returns the same slug", async () => {
		const result = await updatePost(
			SLUG,
			{ title: "Updated", markdown_content: "# Updated\n\nNew content.", status: "draft" },
			mockDb,
			TENANT,
			USER,
			makePlatformEnv(),
		);

		expect(result.slug).toBe(SLUG);
		expect(mockTenantDb.update).toHaveBeenCalledOnce();
	});

	it("generates html_content from markdown_content on update", async () => {
		await updatePost(
			SLUG,
			{ title: "My Post", markdown_content: "Hello world", status: "draft" },
			mockDb,
			TENANT,
			USER,
			makePlatformEnv(),
		);

		// update is called with an object containing html_content
		const updateData = mockTenantDb.update.mock.calls[0][1] as Record<string, unknown>;
		expect(updateData.html_content).toBe("<p>Hello world</p>");
	});

	it("throws 404 when the post does not exist", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(null);

		await expect(
			updatePost(
				"nonexistent-slug",
				{ title: "Whatever", status: "draft" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 404 });
	});

	it("throws 400 when publishing without a title", async () => {
		await expect(
			updatePost(
				SLUG,
				{ title: "", markdown_content: "Has content.", status: "published" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 400 });
	});

	it("throws 400 when publishing without markdown content", async () => {
		await expect(
			updatePost(
				SLUG,
				{ title: "Good Title", markdown_content: "", status: "published" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 400 });
	});

	it("throws 413 when markdown_content exceeds 1 MB", async () => {
		const hugeMd = "x".repeat(1024 * 1024 + 1);

		await expect(
			updatePost(
				SLUG,
				{ title: "Big Post", markdown_content: hugeMd, status: "draft" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 413 });
	});

	it("invalidates caches after a successful update", async () => {
		const kv = {} as KVNamespace;

		await updatePost(
			SLUG,
			{ title: "Post", markdown_content: "Content.", status: "draft" },
			mockDb,
			TENANT,
			USER,
			makePlatformEnv({ CACHE_KV: kv }),
		);

		expect(cache.del).toHaveBeenCalledWith(kv, `garden:${TENANT}:${SLUG}`);
		expect(cache.del).toHaveBeenCalledWith(kv, `garden:list:${TENANT}`);
	});

	it("throws 409 when the new slug is already taken", async () => {
		mockTenantDb.exists.mockResolvedValueOnce(true); // slug conflict

		await expect(
			updatePost(
				SLUG,
				{ title: "Post", markdown_content: "Content.", slug: "taken-slug", status: "draft" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 409 });
	});

	// ── Tier enforcement ────────────────────────────────────────────────────

	it("should reject publish when the wanderer tier post limit is reached", async () => {
		// Arrange: current post is a draft, tenant is on wanderer (25 post limit)
		mockTenantDb.queryOne.mockResolvedValueOnce(
			makePostRecord({ status: "draft", published_at: null }),
		);
		vi.mocked(queryOne).mockResolvedValueOnce({ plan: "wanderer" }); // tenant plan
		mockTenantDb.count.mockResolvedValueOnce(25); // already at the 25-post limit

		// Act + Assert: publishing should throw 403
		await expect(
			updatePost(
				SLUG,
				{
					title: "My 26th Post",
					markdown_content: "Cannot publish this.",
					status: "published",
				},
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).rejects.toMatchObject({ status: 403 });
	});

	it("allows publish when published count is below tier limit", async () => {
		mockTenantDb.queryOne.mockResolvedValue(
			makePostRecord({ status: "draft", published_at: null }),
		);
		vi.mocked(queryOne).mockResolvedValueOnce({ plan: "wanderer" });
		mockTenantDb.count.mockResolvedValueOnce(24); // one below limit

		const result = await updatePost(
			SLUG,
			{ title: "Post", markdown_content: "Content.", status: "published" },
			mockDb,
			TENANT,
			USER,
			makePlatformEnv(),
		);

		expect(result.slug).toBe(SLUG);
		expect(mockTenantDb.update).toHaveBeenCalledOnce();
	});

	it("skips tier check when post is already published (edit, not re-publish)", async () => {
		// Post is already published — no tier enforcement needed
		mockTenantDb.queryOne.mockResolvedValue(makePostRecord({ status: "published" }));
		vi.mocked(queryOne).mockResolvedValue({ plan: "wanderer" });
		mockTenantDb.count.mockResolvedValue(25); // at limit, but shouldn't be checked

		await expect(
			updatePost(
				SLUG,
				{ title: "Post", markdown_content: "Editing existing post.", status: "published" },
				mockDb,
				TENANT,
				USER,
				makePlatformEnv(),
			),
		).resolves.toMatchObject({ slug: SLUG });

		// count should not have been called for the published→published path
		expect(mockTenantDb.count).not.toHaveBeenCalled();
	});

	it("defaults to seedling tier when tenant plan is unrecognized", async () => {
		mockTenantDb.queryOne.mockResolvedValue(
			makePostRecord({ status: "draft", published_at: null }),
		);
		vi.mocked(queryOne).mockResolvedValueOnce({ plan: "unknown-tier" });
		mockTenantDb.count.mockResolvedValueOnce(5); // well below seedling limit of 100

		const result = await updatePost(
			SLUG,
			{ title: "Post", markdown_content: "Content.", status: "published" },
			mockDb,
			TENANT,
			USER,
			makePlatformEnv(),
		);

		expect(result.slug).toBe(SLUG);
	});
});

// ── deletePost ────────────────────────────────────────────────────────────────

describe("deletePost", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// The post is read (not just `exists`d) because deleting it has to take the
		// Fireside conversation behind it, and the link lives on the row.
		mockTenantDb.queryOne.mockResolvedValue({ fireside_session_id: null });
		mockTenantDb.delete.mockResolvedValue(1);
	});

	it("deletes an existing post without throwing", async () => {
		await expect(deletePost(SLUG, mockDb, TENANT)).resolves.toBeUndefined();

		expect(mockTenantDb.delete).toHaveBeenCalledOnce();
	});

	it("throws 404 when post does not exist", async () => {
		mockTenantDb.queryOne.mockResolvedValueOnce(null);

		await expect(deletePost(SLUG, mockDb, TENANT)).rejects.toMatchObject({ status: 404 });

		expect(mockTenantDb.delete).not.toHaveBeenCalled();
	});

	it("takes the conversation with it, since nothing else collects a published one", async () => {
		const prepared: { sql: string; params: unknown[] }[] = [];
		const db = {
			prepare: (sql: string) => ({
				bind: (...params: unknown[]) => ({
					run: async () => {
						prepared.push({ sql, params });
					},
				}),
			}),
		} as unknown as D1Database;

		mockTenantDb.queryOne.mockResolvedValue({ fireside_session_id: "session-1" });

		await deletePost(SLUG, db, TENANT);

		// The FK runs from the post to the session, so nothing cascades this way. The
		// sweep spares a published transcript, and every route back to the conversation
		// went through the post that just stopped existing.
		expect(prepared).toHaveLength(1);
		expect(prepared[0]?.sql).toContain("DELETE FROM fireside_sessions");
		expect(prepared[0]?.params).toEqual(["session-1", TENANT]);
	});

	it("still deletes the post when the conversation cannot be removed", async () => {
		const db = {
			prepare: () => {
				throw new Error("D1 unavailable");
			},
		} as unknown as D1Database;

		mockTenantDb.queryOne.mockResolvedValue({ fireside_session_id: "session-1" });
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(deletePost(SLUG, db, TENANT)).resolves.toBeUndefined();
		consoleSpy.mockRestore();

		// The post is gone; failing the request now would report a delete that happened.
		expect(mockTenantDb.delete).toHaveBeenCalledOnce();
	});

	it("invalidates caches after successful deletion", async () => {
		const kv = {} as KVNamespace;

		await deletePost(SLUG, mockDb, TENANT, kv);

		expect(cache.del).toHaveBeenCalledWith(kv, `garden:${TENANT}:${SLUG}`);
		expect(cache.del).toHaveBeenCalledWith(kv, `garden:list:${TENANT}`);
	});

	it("does not invalidate caches when no kv is provided", async () => {
		await deletePost(SLUG, mockDb, TENANT /* no kv */);

		expect(cache.del).not.toHaveBeenCalled();
	});

	it("checks existence scoped to the correct tenant", async () => {
		await deletePost(SLUG, mockDb, TENANT);

		// getTenantDb should have been called with the right tenant context
		expect(getTenantDb).toHaveBeenCalledWith(mockDb, { tenantId: TENANT });
	});
});
