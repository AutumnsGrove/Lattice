import { json, isHttpError } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { renderMarkdown } from "$lib/utils/markdown.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";
import * as cache from "$lib/server/services/cache.js";
import { moderatePublishedContent } from "$lib/thorn/hooks.js";
import { updateLastActivity } from "$lib/server/activity-tracking.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { TIERS, type TierKey, isValidTier } from "$lib/config/tiers.js";

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
  status?: "draft" | "published";
  featured_image?: string;
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
        await getVerifiedTenantId(
          platform.env.DB,
          locals.tenantId,
          locals.user,
        );
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
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Auth check
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Rate limit content creation to prevent spam
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const { response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("posts/create", locals.user.id),
      limit: 30,
      windowSeconds: 3600, // 30 posts per hour
      namespace: "content-ratelimit",
    });

    if (response) return response;
  }

  try {
    // Verify the authenticated user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const data = sanitizeObject(await request.json()) as PostInput;

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

      const tierKey: TierKey =
        tenant?.plan && isValidTier(tenant.plan) ? tenant.plan : "seedling";
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

    // Validate required fields
    if (!data.title || !data.slug || !data.markdown_content) {
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Validation constants
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB
    const MAX_SLUG_LENGTH = 100;

    // Validate lengths
    if (data.title.length > MAX_TITLE_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    if (data.markdown_content.length > MAX_MARKDOWN_LENGTH) {
      throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }

    if (data.slug.length > MAX_SLUG_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
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

    // Sanitize slug
    const slug = data.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId });

    // Check if slug already exists for this tenant
    const existing = await tenantDb.exists("posts", "slug = ?", [slug]);

    if (existing) {
      throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
    }

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = renderMarkdown(data.markdown_content);

    const tags = JSON.stringify(data.tags || []);

    // Calculate word count and reading time
    const wordCount = data.markdown_content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    // Insert using TenantDb (automatically adds tenant_id and generates id)
    // Note: created_at and updated_at are auto-added by TenantDb.insert()
    await tenantDb.insert("posts", {
      slug,
      title: data.title,
      tags,
      description: data.description || "",
      markdown_content: data.markdown_content,
      html_content,
      gutter_content: data.gutter_content || "[]",
      font: data.font || "default",
      status: data.status || "draft",
      word_count: wordCount,
      reading_time: readingTime,
      fireside_assisted: data.fireside_assisted || 0,
      featured_image: data.featured_image || null,
    });

    // Track activity for inactivity reclamation
    updateLastActivity(platform.env.DB, tenantId);

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
          content: `${data.title}\n\n${data.markdown_content}`,
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

    return json({
      success: true,
      slug,
      message: "Post created successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
