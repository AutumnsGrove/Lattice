import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type { RequestHandler } from "./$types.js";

interface PageInput {
  title?: string;
  markdown_content?: string;
  description?: string;
  hero?: string;
}

/**
 * PUT /api/pages/[slug] - Update an existing page in D1
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

  // Tenant check
  if (!locals.tenantId) {
    throw error(401, "Tenant not found");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
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

    const data = sanitizeObject(await request.json()) as PageInput;

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

    // Check if page exists and belongs to tenant
    const existing = await platform.env.DB.prepare(
      "SELECT slug FROM pages WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, tenantId)
      .first();

    if (!existing) {
      throw error(404, "Page not found");
    }

    // Generate HTML from markdown and sanitize to prevent XSS
    const html_content = sanitizeMarkdown(
      marked.parse(data.markdown_content, { async: false }) as string,
    );

    const now = new Date().toISOString();

    // Build the update query
    const updateQuery = `UPDATE pages
       SET title = ?, description = ?, markdown_content = ?, html_content = ?, hero = ?, updated_at = ?
       WHERE slug = ? AND tenant_id = ?`;

    const queryParams = [
      data.title,
      data.description || "",
      data.markdown_content,
      html_content,
      data.hero || null,
      now,
      slug,
      tenantId,
    ];

    await platform.env.DB.prepare(updateQuery)
      .bind(...queryParams)
      .run();

    return json({
      success: true,
      slug,
      message: "Page updated successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error updating page:", err);
    throw error(
      500,
      err instanceof Error ? err.message : "Failed to update page",
    );
  }
};
