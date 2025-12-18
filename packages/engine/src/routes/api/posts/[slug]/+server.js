import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { getPostBySlug } from "$lib/utils/markdown.js";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";

/**
 * GET /api/posts/[slug] - Get a single post
 * Tries D1 first, falls back to filesystem (UserContent)
 */
export async function GET({ params, platform, locals }) {
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

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const post = await platform.env.DB.prepare(
        `SELECT slug, title, date, tags, description, markdown_content, html_content, gutter_content, font, last_synced, updated_at
         FROM posts
         WHERE slug = ? AND tenant_id = ?`,
      )
        .bind(slug, locals.tenantId)
        .first();

      if (post) {
        return json({
          source: "d1",
          post: {
            ...post,
            tags: post.tags && typeof post.tags === 'string' ? JSON.parse(post.tags) : [],
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
    if (/** @type {{ status?: number }} */ (err).status === 404) throw err;
    console.error("Filesystem fetch error:", err);
    throw error(500, "Failed to fetch post");
  }
}

/**
 * PUT /api/posts/[slug] - Update an existing post in D1
 */
export async function PUT({ params, request, platform, locals }) {
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
    const data = sanitizeObject(await request.json());

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

    // Check if post exists for this tenant
    const existing = await platform.env.DB.prepare(
      "SELECT slug FROM posts WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, locals.tenantId)
      .first();

    if (!existing) {
      throw error(404, "Post not found");
    }

    // Generate HTML from markdown and sanitize to prevent XSS
    const html_content = sanitizeMarkdown(/** @type {string} */ (marked.parse(data.markdown_content, { async: false })));

    // Generate a simple hash of the content
    const encoder = new TextEncoder();
    const contentData = encoder.encode(data.markdown_content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", contentData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const file_hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now = new Date().toISOString();
    const tags = JSON.stringify(data.tags || []);

    // Build the update query with all fields
    const updateQuery = `UPDATE posts
       SET title = ?, date = ?, tags = ?, description = ?, markdown_content = ?, html_content = ?, file_hash = ?, gutter_content = ?, font = ?, updated_at = ?
       WHERE slug = ? AND tenant_id = ?`;

    const params = [
      data.title,
      data.date || now.split("T")[0],
      tags,
      data.description || "",
      data.markdown_content,
      html_content,
      file_hash,
      data.gutter_content || "[]",
      data.font || "default",
      now,
      slug,
      locals.tenantId,
    ];

    await platform.env.DB.prepare(updateQuery)
      .bind(...params)
      .run();

    return json({
      success: true,
      slug,
      message: "Post updated successfully",
    });
  } catch (err) {
    if (/** @type {{ status?: number }} */ (err).status) throw err;
    console.error("Error updating post:", err);
    throw error(500, "Failed to update post");
  }
}

/**
 * DELETE /api/posts/[slug] - Delete a post from D1
 */
export async function DELETE({ request, params, platform, locals }) {
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
    // Check if post exists for this tenant
    const existing = await platform.env.DB.prepare(
      "SELECT slug FROM posts WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, locals.tenantId)
      .first();

    if (!existing) {
      throw error(404, "Post not found");
    }

    await platform.env.DB.prepare(
      "DELETE FROM posts WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, locals.tenantId)
      .run();

    return json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    if (/** @type {{ status?: number }} */ (err).status) throw err;
    console.error("Error deleting post:", err);
    throw error(500, "Failed to delete post");
  }
}
