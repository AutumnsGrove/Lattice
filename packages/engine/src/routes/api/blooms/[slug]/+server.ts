import { json, error, isHttpError } from "@sveltejs/kit";
import { getPostBySlug, renderMarkdown } from "$lib/utils/markdown.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import * as cache from "$lib/server/services/cache.js";
import { moderatePublishedContent } from "$lib/thorn/hooks.js";
import { updateLastActivity } from "$lib/server/activity-tracking.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { TIERS, type TierKey, isValidTier } from "$lib/config/tiers.js";

/**
 * Invalidate blog post caches after create/update/delete
 * Clears both the single post cache and the post list cache
 */
async function invalidatePostCaches(
  kv: KVNamespace | undefined,
  tenantId: string,
  slug: string,
): Promise<void> {
  if (!kv) return;

  try {
    // Invalidate single post cache
    await cache.del(kv, `garden:${tenantId}:${slug}`);
    // Invalidate post list cache
    await cache.del(kv, `garden:list:${tenantId}`);
  } catch (err) {
    // Log but don't fail the request - cache invalidation is not critical
    console.error("[Cache] Failed to invalidate post caches:", err);
  }
}

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
  markdown_content?: string;
  date?: string;
  tags?: string[];
  description?: string;
  gutter_content?: string;
  font?: string;
  status?: "draft" | "published";
  featured_image?: string;
}

/**
 * GET /api/posts/[slug] - Get a single post
 *
 * Access levels:
 * - Anonymous: Only published posts (for public blog access)
 * - Authenticated owner: All posts including drafts
 *
 * Uses TenantDb for automatic tenant isolation
 * Falls back to filesystem (UserContent) if not in D1
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const { slug } = params;

  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Determine access level
  let isOwner = false;
  if (locals.user && platform?.env?.DB) {
    try {
      await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
      isOwner = true;
    } catch {
      // User doesn't own this tenant - treat as anonymous
      isOwner = false;
    }
  }

  // Try D1 first with TenantDb
  if (platform?.env?.DB) {
    try {
      const tenantDb = getTenantDb(platform.env.DB, {
        tenantId: locals.tenantId,
      });

      const post = await tenantDb.queryOne<PostRecord & { status?: string }>(
        "posts",
        "slug = ?",
        [slug],
      );

      if (post) {
        // Check access: owners can see all, anonymous only published
        const isPublished = !post.status || post.status === "published";
        if (!isOwner && !isPublished) {
          throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
        }

        // PERFORMANCE: Cache headers for Cloudflare edge caching
        // Public: 5min cache + 10min stale-while-revalidate (instant responses, background refresh)
        // Owner: private 1min (fresh content while editing)
        const cacheControl = isOwner
          ? "private, max-age=60"
          : "public, max-age=300, stale-while-revalidate=600";

        return json(
          {
            source: "d1",
            post: {
              ...post,
              tags:
                post.tags && typeof post.tags === "string"
                  ? JSON.parse(post.tags)
                  : [],
            },
          },
          {
            headers: { "Cache-Control": cacheControl },
          },
        );
      }
    } catch (err) {
      if ((err as { status?: number }).status === 404) throw err;
      console.error("D1 fetch error:", err);
      // Fall through to filesystem fallback
    }
  }

  // Fallback to filesystem (UserContent)
  try {
    const post = getPostBySlug(slug);

    if (!post) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Reconstruct markdown from the post (we don't have raw markdown stored)
    // For filesystem posts, we return the content without raw markdown
    // PERFORMANCE: Cache headers - filesystem posts are always public
    return json(
      {
        source: "filesystem",
        post: {
          slug: post.slug,
          title: post.title,
          date: post.date,
          tags: post.tags || [],
          description: post.description || "",
          html_content: post.content,
          markdown_content: null, // Not available from filesystem read
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * PUT /api/posts/[slug] - Update an existing post in D1
 * Uses TenantDb for automatic tenant isolation
 */
export const PUT: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
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

  const { slug } = params;

  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    // Verify the authenticated user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const data = sanitizeObject(await request.json()) as PostInput;

    // If publishing a draft, enforce published post limit (isolated — DB failures fail open)
    if (data.status === "published") {
      try {
        // Fetch plan, current post status, and published count in parallel
        // (D1 has no transactions, so soft limits with minimal TOCTOU are by design)
        const [tenant, currentPost, publishedCount] = await Promise.all([
          platform.env.DB.prepare("SELECT plan FROM tenants WHERE id = ?")
            .bind(tenantId)
            .first<{ plan: string }>(),
          platform.env.DB.prepare(
            "SELECT status FROM posts WHERE tenant_id = ? AND slug = ?",
          )
            .bind(tenantId, slug)
            .first<{ status: string }>(),
          platform.env.DB.prepare(
            "SELECT COUNT(*) as count FROM posts WHERE tenant_id = ? AND status = 'published'",
          )
            .bind(tenantId)
            .first<{ count: number }>(),
        ]);

        const tierKey: TierKey =
          tenant?.plan && isValidTier(tenant.plan) ? tenant.plan : "seedling";
        const tierConfig = TIERS[tierKey];

        // Only enforce limit on draft→published transitions
        if (
          tierConfig.limits.posts !== Infinity &&
          currentPost &&
          currentPost.status !== "published" &&
          publishedCount &&
          publishedCount.count >= tierConfig.limits.posts
        ) {
          throwGroveError(403, API_ERRORS.POST_LIMIT_REACHED, "API");
        }
      } catch (err) {
        // Re-throw intentional HTTP errors (limit violations)
        if (isHttpError(err)) throw err;
        // [FAIL_OPEN] DB failure on tier/limit check — allow the write through.
        // Monitor this log line to detect D1 outages bypassing limits.
        console.error("[Blooms] [FAIL_OPEN] Publish limit check failed:", err);
      }
    }

    // Published posts require title + content; drafts accept anything
    const isPublishing = data.status === "published";
    if (isPublishing) {
      if (!data.title?.trim()) {
        throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
      }
      if (!data.markdown_content?.trim()) {
        throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
      }
    }

    const title = data.title?.trim() || "";
    const markdownContent = data.markdown_content || "";

    // Validation constants
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB

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

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId });

    // Check if post exists for this tenant
    const existing = await tenantDb.exists("posts", "slug = ?", [slug]);

    if (!existing) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = markdownContent ? renderMarkdown(markdownContent) : "";

    const tags = JSON.stringify(data.tags || []);
    const unixNow = Math.floor(Date.now() / 1000);

    // Convert date string to Unix timestamp for published_at
    // Only set published_at when publishing (status changes to published)
    let published_at: number | undefined;
    if (data.status === "published" && data.date) {
      published_at = Math.floor(new Date(data.date).getTime() / 1000);
    }

    // Build update object - only include published_at if we're publishing
    const updateData: Record<string, unknown> = {
      title,
      tags,
      description: data.description || "",
      markdown_content: markdownContent,
      html_content,
      gutter_content: data.gutter_content || "[]",
      font: data.font || "default",
      status: data.status,
      updated_at: unixNow,
      featured_image: data.featured_image || null,
    };

    // Set published_at when publishing
    if (published_at !== undefined) {
      updateData.published_at = published_at;
    }

    // Update using TenantDb (automatically adds tenant_id to WHERE clause)
    await tenantDb.update("posts", updateData, "slug = ?", [slug]);

    // Track activity for inactivity reclamation
    updateLastActivity(platform.env.DB, tenantId);

    // Invalidate caches so readers see the updated content
    await invalidatePostCaches(platform.env.CACHE_KV, tenantId, slug);

    // Thorn: async post-edit moderation (non-blocking)
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
          hookPoint: "on_edit",
          contentRef: slug,
        }),
      );
    }

    return json({
      success: true,
      slug,
      message: "Post updated successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

/**
 * DELETE /api/posts/[slug] - Delete a post from D1
 * Uses TenantDb for automatic tenant isolation
 */
export const DELETE: RequestHandler = async ({
  request,
  params,
  platform,
  locals,
}) => {
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

  const { slug } = params;

  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    // Verify the authenticated user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId });

    // Check if post exists for this tenant
    const existing = await tenantDb.exists("posts", "slug = ?", [slug]);

    if (!existing) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Delete using TenantDb (automatically adds tenant_id to WHERE clause)
    await tenantDb.delete("posts", "slug = ?", [slug]);

    // Invalidate caches so the deleted post disappears from listings
    await invalidatePostCaches(platform.env.CACHE_KV, tenantId, slug);

    return json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
