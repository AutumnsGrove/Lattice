import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getTenantDb, now } from "$lib/server/services/database.js";
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
}

/**
 * GET /api/posts - List all posts from D1
 * Uses TenantDb for automatic tenant isolation
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
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
    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

    const posts = await tenantDb.queryMany<PostRecord>(
      'posts',
      undefined,
      [],
      { orderBy: 'date DESC' }
    );

    // Parse JSON tags field
    const formattedPosts = posts.map((post) => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));

    return json({ posts: formattedPosts });
  } catch (err) {
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

  try {
    const data = sanitizeObject(await request.json()) as PostInput;

    // Validate required fields
    if (!data.title || !data.slug || !data.markdown_content) {
      throw error(
        400,
        "Missing required fields: title, slug, markdown_content"
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
        `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`
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

    // Sanitize slug
    const slug = data.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });

    // Check if slug already exists for this tenant
    const existing = await tenantDb.exists('posts', 'slug = ?', [slug]);

    if (existing) {
      throw error(409, "A post with this slug already exists");
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

    // Insert using TenantDb (automatically adds tenant_id and generates id)
    await tenantDb.insert('posts', {
      slug,
      title: data.title,
      date: data.date || timestamp.split("T")[0],
      tags,
      description: data.description || "",
      markdown_content: data.markdown_content,
      html_content,
      gutter_content: data.gutter_content || "[]",
      font: data.font || "default",
      file_hash,
      last_synced: timestamp,
    });

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
