import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";

/**
 * GET /api/posts - List all posts from D1
 */
export async function GET({ platform, locals }) {
  // Auth check for admin access
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }

  try {
    const result = await platform.env.DB.prepare(
      `SELECT slug, title, date, tags, description, last_synced, updated_at
       FROM posts
       WHERE tenant_id = ?
       ORDER BY date DESC`,
    )
      .bind(locals.tenantId)
      .all();

    const posts = result.results.map((/** @type {{ slug: string; title: string; date: string; tags?: string; description?: string }} */ post) => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));

    return json({ posts });
  } catch (err) {
    console.error("Error fetching posts:", err);
    throw error(500, "Failed to fetch posts");
  }
}

/**
 * POST /api/posts - Create a new post in D1
 */
export async function POST({ request, platform, locals }) {
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

  try {
    const data = sanitizeObject(await request.json());

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

    // Sanitize slug
    const slug = data.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists for this tenant
    const existing = await platform.env.DB.prepare(
      "SELECT slug FROM posts WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, locals.tenantId)
      .first();

    if (existing) {
      throw error(409, "A post with this slug already exists");
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

    // Build the insert query with all optional fields
    const insertQuery = `INSERT INTO posts (slug, title, date, tags, description, markdown_content, html_content, gutter_content, font, file_hash, tenant_id, last_synced, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      slug,
      data.title,
      data.date || now.split("T")[0],
      tags,
      data.description || "",
      data.markdown_content,
      html_content,
      data.gutter_content || "[]",
      data.font || "default",
      file_hash,
      locals.tenantId,
      now,
      now,
      now,
    ];

    await platform.env.DB.prepare(insertQuery)
      .bind(...params)
      .run();

    return json({
      success: true,
      slug,
      message: "Post created successfully",
    });
  } catch (err) {
    if (/** @type {{ status?: number }} */ (err).status) throw err;
    console.error("Error creating post:", err);
    throw error(500, "Failed to create post");
  }
}
