/**
 * Blooms CRUD - Business Logic Service
 *
 * Post CRUD operations with tier enforcement, cache invalidation,
 * and content moderation.
 */

import { getPostBySlug, renderMarkdown } from "@autumnsgrove/grove-markdown";
import { sanitizeObject } from "@autumnsgrove/lattice/utils/validation";
import { getTenantDb, queryOne } from "@autumnsgrove/lattice/server/services/database";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import * as cache from "@autumnsgrove/lattice/server/services/cache";
import { moderatePublishedContent } from "@autumnsgrove/thorn/hooks";
import { updateLastActivity } from "@autumnsgrove/lattice/server/activity-tracking";
import { emitPulseEvent } from "@autumnsgrove/lattice/pulse";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { TIERS, type TierKey, isValidTier } from "@autumnsgrove/lattice/platform/config/tiers";
import { isHttpError } from "@sveltejs/kit";

// ============================================================================
// Types
// ============================================================================

interface PostRecord {
	slug: string;
	title: string;
	date?: string;
	tags?: string;
	description?: string;
	markdown_content?: string;
	html_content?: string;
	gutter_content?: string;
	font?: string;
	last_synced?: string;
	updated_at?: string;
}

interface PostInput {
	title?: string;
	slug?: string;
	markdown_content?: string;
	date?: string;
	tags?: string[];
	description?: string;
	gutter_content?: string;
	font?: string;
	status?: "draft" | "published";
	featured_image?: string;
	meadow_exclude?: number;
	republish?: boolean;
	blaze?: string | null;
	spark_prompt?: string | null;
}

// ============================================================================
// Cache Invalidation
// ============================================================================

export async function invalidatePostCaches(
	kv: KVNamespace | undefined,
	tenantId: string,
	slug: string,
): Promise<void> {
	if (!kv) return;

	try {
		await Promise.all([
			cache.del(kv, `garden:${tenantId}:${slug}`),
			cache.del(kv, `garden:list:${tenantId}`),
		]);
	} catch (err) {
		console.error("[Cache] Failed to invalidate post caches:", err);
	}
}

// ============================================================================
// GET - Fetch Post
// ============================================================================

export async function getPost(
	slug: string,
	tenantId: string,
	isOwner: boolean,
	db?: D1Database,
): Promise<{ source: string; post: Record<string, unknown>; cacheControl: string }> {
	// Try D1 first
	if (db) {
		try {
			const tenantDb = getTenantDb(db, { tenantId });
			const post = await tenantDb.queryOne<PostRecord & { status?: string }>("posts", "slug = ?", [
				slug,
			]);

			if (post) {
				const isPublished = !post.status || post.status === "published";
				if (!isOwner && !isPublished) {
					throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
				}

				const cacheControl = isOwner
					? "private, max-age=60"
					: "public, max-age=300, stale-while-revalidate=600";

				return {
					source: "d1",
					post: {
						...post,
						tags: post.tags && typeof post.tags === "string" ? JSON.parse(post.tags) : [],
					},
					cacheControl,
				};
			}
		} catch (err) {
			if ((err as { status?: number }).status === 404) throw err;
			console.error("D1 fetch error:", err);
		}
	}

	// Fallback to filesystem
	const post = getPostBySlug(slug);
	if (!post) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	return {
		source: "filesystem",
		post: {
			slug: post.slug,
			title: post.title,
			date: post.date,
			tags: post.tags || [],
			description: post.description || "",
			html_content: post.content,
			markdown_content: null,
		},
		cacheControl: "public, max-age=300, stale-while-revalidate=600",
	};
}

// ============================================================================
// PUT - Update Post
// ============================================================================

export async function updatePost(
	slug: string,
	requestData: unknown,
	db: D1Database,
	tenantId: string,
	userId: string,
	platformEnv: {
		AI?: Ai;
		OPENROUTER_API_KEY?: string;
		CACHE_KV?: KVNamespace;
	},
	waitUntil?: (promise: Promise<unknown>) => void,
): Promise<{ slug: string }> {
	const data = sanitizeObject(requestData) as PostInput;

	const tenantDbEarly = getTenantDb(db, { tenantId });

	// Fetch current post state
	const currentPost = await tenantDbEarly.queryOne<{ status: string; published_at: number | null }>(
		"posts",
		"slug = ?",
		[slug],
	);

	if (!currentPost) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	// Enforce published post limit on draft->published transition
	if (data.status === "published" && currentPost.status !== "published") {
		try {
			const [tenant, publishedCount] = await Promise.all([
				queryOne<{ plan: string }>(db, "SELECT plan FROM tenants WHERE id = ?", [tenantId]),
				tenantDbEarly.count("posts", "status = ?", ["published"]),
			]);

			const tierKey: TierKey = tenant?.plan && isValidTier(tenant.plan) ? tenant.plan : "seedling";
			const tierConfig = TIERS[tierKey];

			if (tierConfig.limits.posts !== Infinity && publishedCount >= tierConfig.limits.posts) {
				throwGroveError(403, API_ERRORS.POST_LIMIT_REACHED, "API");
			}
		} catch (err) {
			if (isHttpError(err)) throw err;
			console.error("[Blooms] [FAIL_OPEN] Publish limit check failed:", err);
		}
	}

	// Validate required fields for publishing
	const isPublishing = data.status === "published";
	if (isPublishing) {
		if (!data.title?.trim()) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
		if (!data.markdown_content?.trim())
			throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	const title = data.title?.trim() || "";
	const markdownContent = data.markdown_content || "";

	// Validation constants
	const MAX_TITLE_LENGTH = 200;
	const MAX_DESCRIPTION_LENGTH = 500;
	const MAX_MARKDOWN_LENGTH = 1024 * 1024;

	if (title.length > MAX_TITLE_LENGTH) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH)
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	if (markdownContent.length > MAX_MARKDOWN_LENGTH)
		throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");

	// Validate gutter_content JSON
	if (data.gutter_content) {
		try {
			const parsed = JSON.parse(data.gutter_content);
			if (!Array.isArray(parsed)) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		} catch (e) {
			if ((e as { status?: number }).status === 400) throw e;
			throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
		}
	}

	// Validate featured_image URL
	if (data.featured_image && data.featured_image.trim()) {
		try {
			const imageUrl = new URL(data.featured_image);
			if (!["http:", "https:"].includes(imageUrl.protocol))
				throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		} catch (e) {
			if ((e as { status?: number }).status === 400) throw e;
			throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
		}
	}

	const tenantDb = tenantDbEarly;

	// Validate and sanitize new slug
	let newSlug: string | undefined;
	if (data.slug && data.slug !== slug) {
		newSlug = data.slug
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		if (!newSlug || newSlug.length < 1) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		if (newSlug.length > 200) throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");

		const conflict = await tenantDb.exists("posts", "slug = ?", [newSlug]);
		if (conflict) throwGroveError(409, API_ERRORS.VALIDATION_FAILED, "API");
	}

	const html_content = markdownContent ? renderMarkdown(markdownContent) : "";
	const tags = JSON.stringify(data.tags || []);
	const unixNow = Math.floor(Date.now() / 1000);

	let published_at: number | undefined;
	const isFirstPublish = data.status === "published" && currentPost.status !== "published";
	if (isFirstPublish) published_at = unixNow;
	if (data.republish && currentPost.status === "published") published_at = unixNow;

	// Validate blaze slug
	let blazeSlug: string | null | undefined;
	if (data.blaze !== undefined) {
		if (data.blaze === null || data.blaze === "") {
			blazeSlug = null;
		} else {
			const trimmed = data.blaze.trim();
			if (trimmed.length > 40 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmed)) {
				throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
			}
			blazeSlug = trimmed;
		}
	}

	// Build update object
	const updateData: Record<string, unknown> = {
		title,
		tags,
		description: data.description || "",
		markdown_content: markdownContent,
		html_content,
		gutter_content: data.gutter_content || "[]",
		font: data.font || "default",
		// A PUT that does not mention status leaves the post as it was. Passing
		// `undefined` through put a JS undefined into a D1 binding, which D1
		// rejects outright — the update answered 500 instead of 400 or 200.
		status: data.status ?? currentPost.status,
		updated_at: unixNow,
		featured_image: data.featured_image || null,
	};

	if (blazeSlug !== undefined) updateData.blaze = blazeSlug;
	if (data.meadow_exclude !== undefined) updateData.meadow_exclude = data.meadow_exclude;
	if (newSlug) updateData.slug = newSlug;
	if (published_at !== undefined) updateData.published_at = published_at;
	if (data.spark_prompt !== undefined) updateData.spark_prompt = data.spark_prompt;

	// Update with blaze column fallback
	try {
		await tenantDb.update("posts", updateData, "slug = ?", [slug]);
	} catch (updateErr) {
		const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
		if ("blaze" in updateData && /no such column|has no column/i.test(msg)) {
			console.warn("[Blooms] Retrying update without blaze (migration 088 may be pending)");
			delete updateData.blaze;
			await tenantDb.update("posts", updateData, "slug = ?", [slug]);
		} else {
			throw updateErr;
		}
	}

	updateLastActivity(db, tenantId);

	// Invalidate caches
	await invalidatePostCaches(platformEnv.CACHE_KV, tenantId, slug);
	if (newSlug) await invalidatePostCaches(platformEnv.CACHE_KV, tenantId, newSlug);

	// Thorn: async post-edit moderation
	if (platformEnv.AI && data.status === "published" && waitUntil) {
		waitUntil(
			moderatePublishedContent({
				content: `${title}\n\n${markdownContent}`,
				ai: platformEnv.AI,
				db,
				openrouterApiKey: platformEnv.OPENROUTER_API_KEY,
				tenantId,
				userId,
				contentType: "blog_post",
				hookPoint: "on_edit",
				contentRef: newSlug || slug,
			}),
		);
	}

	emitPulseEvent("post.updated", {
		app: "aspen",
		route: `/api/blooms/${slug}`,
		tenant_id: tenantId,
		metadata: { slug: newSlug || slug },
	});

	return { slug: newSlug || slug };
}

// ============================================================================
// DELETE - Delete Post
// ============================================================================

export async function deletePost(
	slug: string,
	db: D1Database,
	tenantId: string,
	kv?: KVNamespace,
): Promise<void> {
	const tenantDb = getTenantDb(db, { tenantId });

	const existing = await tenantDb.exists("posts", "slug = ?", [slug]);
	if (!existing) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	await tenantDb.delete("posts", "slug = ?", [slug]);
	await invalidatePostCaches(kv, tenantId, slug);

	emitPulseEvent("post.deleted", {
		app: "aspen",
		route: `/api/blooms/${slug}`,
		tenant_id: tenantId,
		metadata: { slug },
	});
}
