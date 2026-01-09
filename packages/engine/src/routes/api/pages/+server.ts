import { json, error } from "@sveltejs/kit";
import { marked } from "marked";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeObject } from "$lib/utils/validation.js";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getTenantDb, now } from "$lib/server/services/database.js";
import type { RequestHandler } from "./$types.js";

interface PageInput {
  title?: string;
  slug?: string;
  description?: string;
  markdown_content?: string;
  hero?: string;
  font?: string;
}

/**
 * POST /api/pages - Create a new page in D1
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
    const data = sanitizeObject(await request.json()) as PageInput;

    // Validate required fields
    if (!data.title || !data.markdown_content) {
      throw error(400, "Missing required fields: title, markdown_content");
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

    // Generate slug from title if not provided
    const slug = data.slug
      ? data.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      : data.title
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

    // Validate slug length
    if (slug.length > MAX_SLUG_LENGTH) {
      throw error(400, `Slug too long (max ${MAX_SLUG_LENGTH} characters)`);
    }

    // Basic slug validation
    if (!slug || slug.length < 1) {
      throw error(400, "Invalid slug - must contain at least one character");
    }

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Check if slug already exists for this tenant
    const existing = await tenantDb.exists("pages", "slug = ?", [slug]);

    if (existing) {
      // Suggest alternative slug with timestamp
      const suggested = `${slug}-${Date.now().toString(36)}`;
      throw error(409, {
        message: "A page with this slug already exists",
        suggested_slug: suggested,
      } as any);
    }

    // Generate HTML from markdown and sanitize to prevent XSS
    const html_content = sanitizeMarkdown(
      marked.parse(data.markdown_content, { async: false }) as string,
    );

    const timestamp = now();

    // Insert using TenantDb (automatically adds tenant_id and generates id)
    // The UNIQUE(tenant_id, slug) constraint will catch any race conditions
    try {
      const result = await tenantDb.insert("pages", {
        slug,
        title: data.title,
        description: data.description || "",
        type: "page",
        markdown_content: data.markdown_content,
        html_content,
        hero: data.hero || null,
        gutter_content: "[]",
        font: data.font || "default",
        created_at: timestamp,
        updated_at: timestamp,
      });

      return json({
        success: true,
        slug,
        id:
          typeof result === "string" ? result : (result as { id?: string })?.id,
        message: "Page created successfully",
      });
    } catch (insertErr) {
      // Handle unique constraint violation (race condition where another request created the slug)
      const errMsg = String(insertErr);
      if (
        errMsg.includes("UNIQUE constraint failed") ||
        errMsg.includes("unique")
      ) {
        const suggested = `${slug}-${Date.now().toString(36)}`;
        throw error(409, {
          message: "A page with this slug already exists",
          suggested_slug: suggested,
        } as any);
      }
      throw insertErr;
    }
  } catch (err) {
    // Pass through HTTP errors with status codes
    if ((err as { status?: number }).status) throw err;
    console.error("Error creating page:", err);
    throw error(500, "Failed to create page");
  }
};
