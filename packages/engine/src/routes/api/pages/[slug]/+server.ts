import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { renderMarkdown } from "$lib/utils/markdown.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type { RequestHandler } from "./$types.js";

interface PageInput {
  title?: string;
  markdown_content?: string;
  description?: string;
  hero?: string;
}

interface PagePatchInput {
  show_in_nav?: boolean;
  nav_order?: number;
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

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = renderMarkdown(data.markdown_content);

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

/**
 * PATCH /api/pages/[slug] - Quick update for specific fields (e.g., show_in_nav toggle)
 */
export const PATCH: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // Example tenant bypass for public demo
  const isExampleTenant = locals.tenantId === "example-tenant-001";

  // Auth check (skip for example tenant)
  if (!locals.user && !isExampleTenant) {
    throw error(401, "Unauthorized");
  }

  // Tenant check
  if (!locals.tenantId) {
    throw error(401, "Tenant not found");
  }

  // CSRF check (skip for example tenant since they don't have session cookies)
  if (!isExampleTenant && !validateCSRF(request)) {
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
    // For example tenant, use tenant ID directly; otherwise verify ownership
    let tenantId: string;
    if (isExampleTenant) {
      tenantId = locals.tenantId;
    } else {
      tenantId = await getVerifiedTenantId(
        platform.env.DB,
        locals.tenantId,
        locals.user,
      );
    }

    const data = sanitizeObject(await request.json()) as PagePatchInput;

    // Check if page exists and belongs to tenant
    const existing = await platform.env.DB.prepare(
      "SELECT slug FROM pages WHERE slug = ? AND tenant_id = ?",
    )
      .bind(slug, tenantId)
      .first();

    if (!existing) {
      throw error(404, "Page not found");
    }

    // Build dynamic update based on provided fields
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (typeof data.show_in_nav === "boolean") {
      updates.push("show_in_nav = ?");
      values.push(data.show_in_nav ? 1 : 0);
    }

    if (typeof data.nav_order === "number") {
      updates.push("nav_order = ?");
      values.push(data.nav_order);
    }

    if (updates.length === 0) {
      throw error(400, "No valid fields to update");
    }

    // Always update the timestamp
    updates.push("updated_at = unixepoch()");

    const updateQuery = `UPDATE pages SET ${updates.join(", ")} WHERE slug = ? AND tenant_id = ?`;
    values.push(slug, tenantId);

    await platform.env.DB.prepare(updateQuery)
      .bind(...values)
      .run();

    return json({
      success: true,
      slug,
      message: "Page updated successfully",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error patching page:", err);
    throw error(
      500,
      err instanceof Error ? err.message : "Failed to update page",
    );
  }
};
