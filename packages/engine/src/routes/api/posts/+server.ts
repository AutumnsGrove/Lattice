import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { renderMarkdown } from "$lib/utils/markdown.js";
import { getTenantDb, now } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";
import * as cache from "$lib/server/services/cache.js";
import type { RequestHandler } from "./$types.js";

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
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
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

    return json({ posts: formattedPosts });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error fetching posts:", err);
    throw error(500, "Failed to fetch posts");
  }
};

/**
 * POST /api/posts - Create a new post in D1
 * Uses TenantDb for automatic tenant isolation
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
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

    // Validate required fields
    if (!data.title || !data.slug || !data.markdown_content) {
      throw error(
        400,
        "Missing required fields: title, slug, markdown_content",
      );
    }

    // Validation constants
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB
    const MAX_SLUG_LENGTH = 100;

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

    if (data.slug.length > MAX_SLUG_LENGTH) {
      throw error(400, `Slug too long (max ${MAX_SLUG_LENGTH} characters)`);
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
      throw error(409, "A post with this slug already exists");
    }

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = renderMarkdown(data.markdown_content);

    const timestamp = now();
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

    // Invalidate post list cache so the new post appears in listings
    if (kv) {
      try {
        await cache.del(kv, `blog:list:${tenantId}`);
      } catch (err) {
        console.error("[Cache] Failed to invalidate list cache:", err);
      }
    }

    return json({
      success: true,
      slug,
      message: "Post created successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating post:", err);
    throw error(500, "Failed to create post");
  }
};
