import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { getEndpointLimitByKey } from "$lib/threshold/config.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/**
 * Data Export API
 *
 * Allows users to export their data in various formats:
 * - full: All posts, pages, images, and settings
 * - posts: Blog posts in Markdown format
 * - media: Uploaded images and files
 *
 * Privacy Policy Section 5.2 guarantees:
 * "You can export your data (posts, pages, media) at any time in standard formats."
 *
 * Rate limiting: 10 exports per hour per tenant (configured in rate-limits/config.ts).
 */

export type ExportType = "full" | "posts" | "media" | "pages";

// Rate limit config is now centralized in $lib/server/rate-limits/config.ts
const EXPORT_RATE_LIMIT = getEndpointLimitByKey("export/data");

interface PostRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  markdown_content: string;
  tags: string;
  status: string;
  featured_image: string | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
}

interface PageRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  markdown_content: string;
  type: string;
  created_at: number;
  updated_at: number;
}

interface MediaRecord {
  id: string;
  filename: string;
  original_name: string;
  r2_key: string;
  url: string;
  size: number;
  mime_type: string;
  alt_text: string | null;
  uploaded_at: number;
}

/** Request body for POST /api/export */
interface ExportRequest {
  type: ExportType;
}

/**
 * POST /api/export
 *
 * Returns exported data as JSON (for now).
 * Future: Return as ZIP file with markdown files and media.
 *
 * Uses POST (not GET) because:
 * 1. Exports are non-idempotent (rate limiting consumes quota)
 * 2. Prevents accidental triggering via image tags, link prefetch, or browser history
 * 3. Enables CSRF protection to prevent malicious sites from triggering exports
 * 4. Audit logs should not be written from GET requests (side effects)
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  const body = (await request.json()) as ExportRequest;
  const exportType = body.type || "full";
  const validTypes = ["full", "posts", "media", "pages"];

  if (!validTypes.includes(exportType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const requestedTenantId = locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user,
    );

    // Check export size BEFORE rate limit (don't consume quota for oversized exports)
    // Tenants with >5000 items should contact support for bulk exports
    const MAX_EXPORT_ITEMS = 5000;
    if (exportType === "full" || exportType === "posts") {
      const postCount = await platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?",
      )
        .bind(tenantId)
        .first<{ count: number }>();

      if (postCount && postCount.count > MAX_EXPORT_ITEMS) {
        throwGroveError(413, API_ERRORS.EXPORT_TOO_LARGE, "API");
      }
    }

    if (exportType === "full" || exportType === "media") {
      const mediaCount = await platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM media WHERE tenant_id = ?",
      )
        .bind(tenantId)
        .first<{ count: number }>();

      if (mediaCount && mediaCount.count > MAX_EXPORT_ITEMS) {
        throwGroveError(413, API_ERRORS.EXPORT_TOO_LARGE, "API");
      }
    }

    if (exportType === "full" || exportType === "pages") {
      const pageCount = await platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?",
      )
        .bind(tenantId)
        .first<{ count: number }>();

      if (pageCount && pageCount.count > MAX_EXPORT_ITEMS) {
        throwGroveError(413, API_ERRORS.EXPORT_TOO_LARGE, "API");
      }
    }

    // Check rate limit after size validation (so oversized exports don't consume quota)
    // Uses Threshold SDK from $lib/threshold
    const threshold = createThreshold(platform?.env);
    let rateLimitResult = {
      allowed: true,
      remaining: EXPORT_RATE_LIMIT.limit,
      resetAt: 0,
    };

    if (threshold) {
      const { result, response } = await thresholdCheckWithResult(threshold, {
        key: `export:${tenantId}`,
        limit: EXPORT_RATE_LIMIT.limit,
        windowSeconds: EXPORT_RATE_LIMIT.windowSeconds,
      });
      rateLimitResult = result;
      if (response) {
        // Return the 429 response from the middleware
        return response;
      }
    } else {
      console.warn("[Export] KV not configured, rate limiting disabled");
    }

    const exportData: {
      exportedAt: string;
      type: ExportType;
      tenant: string;
      posts?: Array<{
        slug: string;
        title: string;
        description: string | null;
        content: string;
        tags: string[];
        status: string;
        featuredImage: string | null;
        publishedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      pages?: Array<{
        slug: string;
        title: string;
        description: string | null;
        content: string;
        type: string;
        createdAt: string;
        updatedAt: string;
      }>;
      media?: Array<{
        filename: string;
        originalName: string;
        url: string;
        size: number;
        mimeType: string;
        altText: string | null;
        uploadedAt: string;
      }>;
    } = {
      exportedAt: new Date().toISOString(),
      type: exportType,
      tenant: tenantId,
    };

    // Export posts
    if (exportType === "full" || exportType === "posts") {
      const posts = await platform.env.DB.prepare(
        `SELECT id, slug, title, description, markdown_content, tags, status,
                featured_image, published_at, created_at, updated_at
         FROM posts WHERE tenant_id = ?
         ORDER BY created_at DESC`,
      )
        .bind(tenantId)
        .all<PostRecord>();

      exportData.posts = (posts.results || []).map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.description,
        content: post.markdown_content,
        tags: JSON.parse(post.tags || "[]"),
        status: post.status,
        featuredImage: post.featured_image,
        publishedAt: post.published_at
          ? new Date(post.published_at * 1000).toISOString()
          : null,
        createdAt: new Date(post.created_at * 1000).toISOString(),
        updatedAt: new Date(post.updated_at * 1000).toISOString(),
      }));
    }

    // Export pages
    if (exportType === "full" || exportType === "pages") {
      const pages = await platform.env.DB.prepare(
        `SELECT id, slug, title, description, markdown_content, type, created_at, updated_at
         FROM pages WHERE tenant_id = ?
         ORDER BY display_order ASC`,
      )
        .bind(tenantId)
        .all<PageRecord>();

      exportData.pages = (pages.results || []).map((page) => ({
        slug: page.slug,
        title: page.title,
        description: page.description,
        content: page.markdown_content,
        type: page.type,
        createdAt: new Date(page.created_at * 1000).toISOString(),
        updatedAt: new Date(page.updated_at * 1000).toISOString(),
      }));
    }

    // Export media (metadata only - actual files available via URLs)
    if (exportType === "full" || exportType === "media") {
      const media = await platform.env.DB.prepare(
        `SELECT id, filename, original_name, r2_key, url, size, mime_type, alt_text, uploaded_at
         FROM media WHERE tenant_id = ?
         ORDER BY uploaded_at DESC`,
      )
        .bind(tenantId)
        .all<MediaRecord>();

      exportData.media = (media.results || []).map((m) => ({
        filename: m.filename,
        originalName: m.original_name,
        url: m.url,
        size: m.size,
        mimeType: m.mime_type,
        altText: m.alt_text,
        uploadedAt: new Date(m.uploaded_at * 1000).toISOString(),
      }));
    }

    // Audit log: data export
    try {
      await platform.env.DB.prepare(
        `INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          tenantId,
          "data_export",
          "export_requested",
          JSON.stringify({
            type: exportType,
            postsCount: exportData.posts?.length ?? 0,
            pagesCount: exportData.pages?.length ?? 0,
            mediaCount: exportData.media?.length ?? 0,
          }),
          locals.user.email,
          Math.floor(Date.now() / 1000),
        )
        .run();
    } catch (e) {
      // Don't fail export if audit logging fails
      console.error("[Export Audit] Failed to log:", e);
    }

    // Return as JSON with download headers
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="grove-export-${exportType}-${new Date().toISOString().split("T")[0]}.json"`,
        "Cache-Control": "no-cache",
        ...thresholdHeaders(rateLimitResult, EXPORT_RATE_LIMIT.limit),
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
