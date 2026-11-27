import { json, isHttpError } from "@sveltejs/kit";
import { sanitizeObject } from "@autumnsgrove/lattice/utils/validation";
import { renderMarkdown } from "@autumnsgrove/grove-markdown";
import { getTenantDb } from "@autumnsgrove/lattice/server/services/database";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import * as cache from "@autumnsgrove/lattice/server/services/cache";
import { moderatePublishedContent } from "@autumnsgrove/thorn/hooks";
import { updateLastActivity } from "@autumnsgrove/lattice/server/activity-tracking";
import { emitPulseEvent } from "@autumnsgrove/lattice/pulse";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { TIERS, type TierKey, isValidTier } from "@autumnsgrove/lattice/platform/config/tiers";
import { isBetaDeployment } from "$lib/server/beta";
import {
	readFiresideInput,
	recordAcceptance,
	requireOwnedFiresideSession,
} from "$lib/server/fireside/publish";

interface PostRecord {
	id?: string;
	slug: string;
	title: string;
	date: string;
	tags?: string;
	description?: string;
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
	fireside_assisted?: number;
	/** The conversation this post was written from, when there was one. */
	fireside?: { sessionId?: string; transcriptPublic?: boolean };
	status?: "draft" | "published";
	featured_image?: string;
	meadow_exclude?: number;
	blaze?: string;
	spark_prompt?: string | null;
}

/**
 * Generate the next sequential "Untitled" title for a tenant.
 * Returns "Untitled", "Untitled 2", "Untitled 3", etc.
 *
 * Note: Concurrent saves could produce duplicate titles since there's no
 * transaction isolation on title uniqueness. This is acceptable because
 * titles aren't unique keys (slug is), and slug conflicts are already
 * handled via 409 responses. Worst case: two posts share a title.
 */
async function getNextUntitledTitle(db: D1Database, tenantId: string): Promise<string> {
	const result = await db
		.prepare("SELECT title FROM posts WHERE tenant_id = ? AND title LIKE 'Untitled%'")
		.bind(tenantId)
		.all<{ title: string }>();

	const existingNumbers = (result.results ?? [])
		.map((r) => r.title as string)
		.map((t) => {
			if (t === "Untitled") return 1;
			const match = t.match(/^Untitled (\d+)$/);
			return match ? parseInt(match[1], 10) : 0;
		})
		.filter((n) => n > 0);

	if (existingNumbers.length === 0) return "Untitled";

	const maxNumber = Math.max(...existingNumbers);
	return `Untitled ${maxNumber + 1}`;
}

/**
 * GET /api/posts - List posts from D1
 *
 * Access levels:
 * - Anonymous: Only published posts (for public blog, RSS, crawlers)
 * - Authenticated owner: All posts including drafts (for admin)
 *
 * Uses TenantDb for automatic tenant isolation
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		// Determine access level
		let isOwner = false;
		if (locals.user) {
			try {
				// Check if authenticated user owns this tenant
				await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
				isOwner = true;
			} catch {
				// User is authenticated but doesn't own this tenant - treat as anonymous
				isOwner = false;
			}
		}

		// Use TenantDb for automatic tenant isolation
		const tenantDb = getTenantDb(platform.env.DB, {
			tenantId: locals.tenantId,
		});

		// Query based on access level
		let posts: PostRecord[];
		if (isOwner) {
			// Owner sees all posts (including drafts)
			posts = await tenantDb.queryMany<PostRecord>("posts", undefined, [], {
				orderBy: "published_at DESC",
			});
		} else {
			// Anonymous/non-owner only sees published posts
			// Check for status column, fall back to returning all if no status field exists
			posts = await tenantDb.queryMany<PostRecord>(
				"posts",
				"status = ? OR status IS NULL",
				["published"],
				{ orderBy: "published_at DESC" },
			);
		}

		// Parse JSON tags field
		const formattedPosts = posts.map((post) => ({
			...post,
			tags: post.tags ? JSON.parse(post.tags) : [],
		}));

		return json(
			{ posts: formattedPosts },
			{
				headers: {
					"Cache-Control": "public, max-age=60, stale-while-revalidate=120",
				},
			},
		);
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * POST /api/posts - Create a new post in D1
 * Uses TenantDb for automatic tenant isolation
 */
export const POST: RequestHandler = async ({ request, platform, locals, url }) => {
	// Auth check
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const kv = platform?.env?.CACHE_KV;

	// Rate limit content creation to prevent spam
	const threshold = createThreshold(platform?.env, {
		identifier: locals.user?.id,
	});
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `posts/create:${locals.user.id}`,
			limit: 30,
			windowSeconds: 3600, // 30 posts per hour
			failMode: "open",
		});

		if (denied) return denied;
	}

	try {
		// Verify the authenticated user owns this tenant
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user, {
			isInternalService: locals.isInternalService,
		});

		const data = sanitizeObject(await request.json()) as PostInput;

		// Acceptance rides on the save so the post cannot exist without its
		// attribution. The session is checked here, before the insert, so a save
		// carrying someone else's conversation writes nothing at all.
		const fireside = readFiresideInput(data.fireside);
		const firesideSession = fireside
			? await requireOwnedFiresideSession(
					platform.env.DB,
					tenantId,
					locals.user.id,
					fireside.sessionId,
				)
			: null;

		// Tier-based limit enforcement (isolated — DB failures fail open)
		// Run all queries in parallel to minimize latency (per AGENT.md parallelization pattern)
		let tenant: { plan: string } | null;
		let draftCount: { count: number } | null;
		let publishedCount: { count: number } | null;
		try {
			[tenant, draftCount, publishedCount] = await Promise.all([
				platform.env.DB.prepare("SELECT plan FROM tenants WHERE id = ?")
					.bind(tenantId)
					.first<{ plan: string }>(),
				platform.env.DB.prepare(
					"SELECT COUNT(*) as count FROM posts WHERE tenant_id = ? AND status = 'draft'",
				)
					.bind(tenantId)
					.first<{ count: number }>(),
				platform.env.DB.prepare(
					"SELECT COUNT(*) as count FROM posts WHERE tenant_id = ? AND status = 'published'",
				)
					.bind(tenantId)
					.first<{ count: number }>(),
			]);

			const tierKey: TierKey = tenant?.plan && isValidTier(tenant.plan) ? tenant.plan : "seedling";
			const tierConfig = TIERS[tierKey];

			// Check blog access
			if (!tierConfig.features.blog) {
				throwGroveError(403, API_ERRORS.BLOG_NOT_AVAILABLE, "API");
			}

			// Enforce draft or published post limit (mutually exclusive branches)
			const isDraft = !data.status || data.status === "draft";

			if (isDraft && tierConfig.limits.drafts !== Infinity && draftCount) {
				if (draftCount.count >= tierConfig.limits.drafts) {
					throwGroveError(403, API_ERRORS.DRAFT_LIMIT_REACHED, "API");
				}
			}

			if (!isDraft && tierConfig.limits.posts !== Infinity && publishedCount) {
				if (publishedCount.count >= tierConfig.limits.posts) {
					throwGroveError(403, API_ERRORS.POST_LIMIT_REACHED, "API");
				}
			}
		} catch (err) {
			// Re-throw intentional HTTP errors (limit violations, blog gating)
			if (isHttpError(err)) throw err;
			// [FAIL_OPEN] DB failure on tier/limit check — allow the write through.
			// Monitor this log line to detect D1 outages bypassing limits.
			console.error("[Blooms] [FAIL_OPEN] Tier limit check failed:", err);
		}

		// Published posts require title + content; drafts generate defaults.
		// Explicit check — anything that isn't "published" is treated as a draft.
		const isPublishing = data.status === "published";
		if (isPublishing) {
			if (!data.title?.trim()) {
				throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
			}
			if (!data.markdown_content?.trim()) {
				throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
			}
		}

		// Generate defaults for missing fields on drafts
		let title = data.title?.trim() || "";
		if (!title) {
			title = await getNextUntitledTitle(platform.env.DB, tenantId);
		}
		const markdownContent = data.markdown_content || "";

		// Validation constants
		const MAX_TITLE_LENGTH = 200;
		const MAX_DESCRIPTION_LENGTH = 500;
		const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB
		const MAX_SLUG_LENGTH = 100;

		// Validate lengths (only when values are present)
		if (title.length > MAX_TITLE_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		if (markdownContent.length > MAX_MARKDOWN_LENGTH) {
			throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
		}

		// Validate gutter_content is valid JSON if provided
		if (data.gutter_content) {
			try {
				const parsed = JSON.parse(data.gutter_content);
				if (!Array.isArray(parsed)) {
					throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
				}
			} catch (e) {
				if ((e as { status?: number }).status === 400) throw e;
				throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
			}
		}

		// Validate featured_image URL if provided
		if (data.featured_image && data.featured_image.trim()) {
			try {
				const imageUrl = new URL(data.featured_image);
				if (!["http:", "https:"].includes(imageUrl.protocol)) {
					throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
				}
			} catch (e) {
				if ((e as { status?: number }).status === 400) throw e;
				throwGroveError(400, API_ERRORS.INVALID_FILE, "API");
			}
		}

		// Generate slug from title if not provided
		const rawSlug = data.slug?.trim() || title;
		const slug = rawSlug
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		if (slug.length > MAX_SLUG_LENGTH) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Use TenantDb for automatic tenant isolation
		const tenantDb = getTenantDb(platform.env.DB, { tenantId });

		// Check if slug already exists for this tenant
		const existing = await tenantDb.exists("posts", "slug = ?", [slug]);

		if (existing) {
			throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
		}

		// Generate HTML from markdown (renderMarkdown handles sanitization)
		const html_content = markdownContent ? renderMarkdown(markdownContent) : "";

		const tags = JSON.stringify(data.tags || []);

		// Calculate word count and reading time
		const wordCount = markdownContent ? markdownContent.split(/\s+/).filter(Boolean).length : 0;
		const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

		// Validate blaze slug if provided
		const blazeSlug = data.blaze?.trim() || null;
		if (blazeSlug) {
			if (blazeSlug.length > 40 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(blazeSlug)) {
				throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
			}
		}

		// Insert using TenantDb (automatically adds tenant_id and generates id)
		// Note: created_at and updated_at are auto-added by TenantDb.insert()
		const insertData: Record<string, unknown> = {
			slug,
			title,
			tags,
			description: data.description || "",
			markdown_content: markdownContent,
			html_content,
			gutter_content: data.gutter_content || "[]",
			font: data.font || "default",
			status: data.status || "draft",
			word_count: wordCount,
			reading_time: readingTime,
			// The link column only appears when there is a conversation to link, so a
			// post written by hand never names a column the migration has to add.
			...(firesideSession && fireside
				? { fireside_assisted: 1, fireside_session_id: fireside.sessionId }
				: { fireside_assisted: data.fireside_assisted || 0 }),
			featured_image: data.featured_image || null,
			meadow_exclude: data.meadow_exclude ?? 0,
			blaze: blazeSlug,
			spark_prompt: data.spark_prompt || null,
			is_beta: isBetaDeployment(locals, url) ? 1 : 0,
			// Set published_at on direct publish (skipping draft stage) so RSS and
			// meadow poller see the correct timestamp instead of NULL.
			...(data.status === "published" ? { published_at: Math.floor(Date.now() / 1000) } : {}),
		};

		// Retry without blaze/is_beta columns if their migrations haven't landed yet
		try {
			await tenantDb.insert("posts", insertData);
		} catch (insertErr) {
			const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
			if (/no such column|has no column/i.test(msg)) {
				if ("blaze" in insertData && msg.includes("blaze")) {
					console.warn("[Blooms] Retrying insert without blaze (migration 088 may be pending)");
					delete insertData.blaze;
					await tenantDb.insert("posts", insertData);
				} else if ("is_beta" in insertData && msg.includes("is_beta")) {
					console.warn("[Blooms] Retrying insert without is_beta (migration 118 may be pending)");
					delete insertData.is_beta;
					await tenantDb.insert("posts", insertData);
				} else {
					throw insertErr;
				}
			} else {
				throw insertErr;
			}
		}

		// Track activity for inactivity reclamation
		updateLastActivity(platform.env.DB, tenantId);

		// The post exists with its attribution; now record the acceptance behind it. If
		// this is lost the post is still true — the session is merely still `drafted`.
		if (fireside && firesideSession) {
			await recordAcceptance({
				db: platform.env.DB,
				tenantId,
				userId: locals.user.id,
				sessionId: fireside.sessionId,
				slug,
				transcriptPublic: fireside.transcriptPublic,
				session: firesideSession,
				env: platform.env,
				waitUntil: platform.context?.waitUntil.bind(platform.context),
			});
		}

		// Invalidate post list cache so the new post appears in listings
		if (kv) {
			try {
				await cache.del(kv, `garden:list:${tenantId}`);
			} catch (err) {
				console.error("[Cache] Failed to invalidate list cache:", err);
			}
		}

		// Thorn: async post-publish moderation (non-blocking)
		if (platform?.env?.AI && data.status === "published" && platform.context) {
			platform.context.waitUntil(
				moderatePublishedContent({
					content: `${title}\n\n${markdownContent}`,
					ai: platform.env.AI,
					db: platform.env.DB,
					openrouterApiKey: platform.env.OPENROUTER_API_KEY,
					tenantId,
					userId: locals.user.id,
					contentType: "blog_post",
					hookPoint: "on_publish",
					contentRef: slug,
				}),
			);
		}

		emitPulseEvent("post.published", {
			app: "aspen",
			route: "/api/blooms",
			tenant_id: tenantId,
			metadata: { slug, status: data.status },
		});

		return json({
			success: true,
			slug,
			title,
			message: "Post created successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
