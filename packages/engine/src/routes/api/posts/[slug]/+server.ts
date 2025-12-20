import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { getPostBySlug } from "$lib/utils/markdown.js";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getTenantDb, now } from "$lib/server/services/database.js";
import type { RequestHandler } from "./$types.js";

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
}

/**
 * GET /api/posts/[slug] - Get a single post
 * Uses TenantDb for automatic tenant isolation
 * Falls back to filesystem (UserContent) if not in D1
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const { slug } = params;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }

  // Try D1 first with TenantDb
  if (platform?.env?.DB) {
    try {
      const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

      const post = await tenantDb.queryOne<PostRecord>('posts', 'slug = ?', [slug]);

      if (post) {
        return json({
          source: "d1",
          post: {
            ...post,
            tags:
              post.tags && typeof post.tags === "string"
                ? JSON.parse(post.tags)
                : [],
          },
        });
      }
    } catch (err) {
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
    return json({
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
    });
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
        `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`
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

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

    // Check if post exists for this tenant
    const existing = await tenantDb.exists('posts', 'slug = ?', [slug]);

    if (!existing) {
      throw error(404, "Post not found");
    }

    // Generate HTML from markdown and sanitize to prevent XSS
    const html_content = sanitizeMarkdown(
      marked.parse(data.markdown_content, { async: false }) as string
    );

    // Generate a simple hash of the content
    const encoder = new TextEncoder();
    const contentData = encoder.encode(data.markdown_content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", contentData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const file_hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const timestamp = now();
    const tags = JSON.stringify(data.tags || []);

    // Update using TenantDb (automatically adds tenant_id to WHERE clause)
    await tenantDb.update(
      'posts',
      {
        title: data.title,
        date: data.date || timestamp.split("T")[0],
        tags,
        description: data.description || "",
        markdown_content: data.markdown_content,
        html_content,
        file_hash,
        gutter_content: data.gutter_content || "[]",
        font: data.font || "default",
      },
      'slug = ?',
      [slug]
    );

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
    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

    // Check if post exists for this tenant
    const existing = await tenantDb.exists('posts', 'slug = ?', [slug]);

    if (!existing) {
      throw error(404, "Post not found");
    }

    // Delete using TenantDb (automatically adds tenant_id to WHERE clause)
    await tenantDb.delete('posts', 'slug = ?', [slug]);

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
