import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { renderMarkdown } from "$lib/utils/markdown.js";
import { getTenantDb, now } from "$lib/server/services/database.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Rate limit content creation to prevent spam
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `pages/create:${locals.user.id}`,
      limit: 20,
      windowSeconds: 3600, // 20 pages per hour
      failMode: "open",
    });

    if (denied) return denied;
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
      throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
    }

    // Validation constants
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_MARKDOWN_LENGTH = 1024 * 1024; // 1MB
    const MAX_SLUG_LENGTH = 100;

    // Validate lengths
    if (data.title.length > MAX_TITLE_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    if (data.markdown_content.length > MAX_MARKDOWN_LENGTH) {
      throwGroveError(413, API_ERRORS.CONTENT_TOO_LARGE, "API");
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
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    // Basic slug validation
    if (!slug || slug.length < 1) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    // Use TenantDb for automatic tenant isolation
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId,
    });

    // Check if slug already exists for this tenant
    const existing = await tenantDb.exists("pages", "slug = ?", [slug]);

    if (existing) {
      // Suggest alternative slug with timestamp
      throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
    }

    // Generate HTML from markdown (renderMarkdown handles sanitization)
    const html_content = renderMarkdown(data.markdown_content);

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
        throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
      }
      throw insertErr;
    }
  } catch (err) {
    // Pass through HTTP errors with status codes
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
