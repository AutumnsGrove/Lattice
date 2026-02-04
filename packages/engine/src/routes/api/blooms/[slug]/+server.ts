import { json, error } from "@sveltejs/kit";
import { getPostBySlug, renderMarkdown } from "$lib/utils/markdown.js";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import * as cache from "$lib/server/services/cache.js";
import type { RequestHandler } from "./$types.js";

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
    throw error(400, "Slug is required");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
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
          throw error(404, "Post not found");
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
      throw error(404, "Post not found");
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
    console.error("Filesystem fetch error:", err);
    throw error(500, "Failed to fetch post");
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
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }

  const { slug } = params;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    // Verify the authenticated user owns this tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    const data = sanitizeObject(await request.json()) as PostInput;

    // Validate required fields
    if (!data.title || !data.markdown_content) {
      throw error(400, "Missing required fields: title, markdown_content");
    }

    // Validation constants
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB

    // Validate lengths
    if (data.title.length > MAX_TITLE_LENGTH) {
      throw error(400, `Title too long (max ${MAX_TITLE_LENGTH} characters)`);
    }

    if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
      throw error(
        400,
        `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`,
      );
    }

    if (data.markdown_content.length > MAX_MARKDOWN_LENGTH) {
      throw error(400, "Content too large (max 1MB)");
    }

    // Validate gutter_content is valid JSON if provided
    if (data.gutter_content) {
      try {
        const parsed = JSON.parse(data.gutter_content);
        if (!Array.isArray(parsed)) {
          throw error(400, "gutter_content must be a JSON array");
        }
      } catch (e) {
        if ((e as { status?: number }).status === 400) throw e;
        throw error(400, "gutter_content must be valid JSON");
      }
    }

    // Validate featured_image URL if provided
    if (data.featured_image && data.featured_image.trim()) {
      try {
        const imageUrl = new URL(data.featured_image);
        if (!["http:", "https:"].includes(imageUrl.protocol)) {
          throw error(400, "Cover image must be an HTTP or HTTPS URL");
        }
      } catch (e) {
        if ((e as { status?: number }).status === 400) throw e;
        throw error(400, "Cover image must be a valid URL");
      }
    }

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId });

    // Check if post exists for this tenant
    const existing = await tenantDb.exists("posts", "slug = ?", [slug]);

    if (!existing) {
      throw error(404, "Post not found");
    }

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = renderMarkdown(data.markdown_content);

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
      title: data.title,
      tags,
      description: data.description || "",
      markdown_content: data.markdown_content,
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

    // Invalidate caches so readers see the updated content
    await invalidatePostCaches(platform.env.CACHE_KV, tenantId, slug);

    return json({
      success: true,
      slug,
      message: "Post updated successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error updating post:", err);
    throw error(500, "Failed to update post");
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
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }

  const { slug } = params;

  if (!slug) {
    throw error(400, "Slug is required");
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
      throw error(404, "Post not found");
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
    console.error("Error deleting post:", err);
    throw error(500, "Failed to delete post");
  }
};
