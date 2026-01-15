import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { validateCSRF } from "$lib/utils/csrf.js";

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
 * Rate limiting: 10 exports per hour per tenant to prevent abuse.
 */

export type ExportType = "full" | "posts" | "media" | "pages";

// Rate limiting configuration
const RATE_LIMIT_MAX = 10; // Max exports per window
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

/**
 * Check and update rate limit for data exports.
 * Returns true if within limits, false if rate limited.
 */
async function checkRateLimit(
  kv: KVNamespace | undefined,
  tenantId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!kv) {
    // If KV not available, allow but log warning
    console.warn("[Export] KV not configured, rate limiting disabled");
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: 0 };
  }

  const key = `export_ratelimit:${tenantId}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    const data = await kv.get(key, "json") as { count: number; windowStart: number } | null;

    if (!data || now - data.windowStart >= RATE_LIMIT_WINDOW_SECONDS) {
      // New window - reset counter
      await kv.put(key, JSON.stringify({ count: 1, windowStart: now }), {
        expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
      });
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - 1,
        resetAt: now + RATE_LIMIT_WINDOW_SECONDS,
      };
    }

    if (data.count >= RATE_LIMIT_MAX) {
      // Rate limited
      return {
        allowed: false,
        remaining: 0,
        resetAt: data.windowStart + RATE_LIMIT_WINDOW_SECONDS,
      };
    }

    // Increment counter
    await kv.put(key, JSON.stringify({ count: data.count + 1, windowStart: data.windowStart }), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS - (now - data.windowStart),
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - data.count - 1,
      resetAt: data.windowStart + RATE_LIMIT_WINDOW_SECONDS,
    };
  } catch (e) {
    console.error("[Export] Rate limit check failed:", e);
    // On error, allow the request but log it
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: 0 };
  }
}

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
    throw error(401, "Unauthorized");
  }

  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const body = (await request.json()) as ExportRequest;
  const exportType = body.type || "full";
  const validTypes = ["full", "posts", "media", "pages"];

  if (!validTypes.includes(exportType)) {
    throw error(400, `Invalid export type. Valid types: ${validTypes.join(", ")}`);
  }

  const requestedTenantId = locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

    // Check rate limit before processing export
    const rateLimit = await checkRateLimit(platform.env.CACHE_KV, tenantId);
    if (!rateLimit.allowed) {
      // Calculate human-readable wait time
      const nowSeconds = Math.floor(Date.now() / 1000);
      const waitMinutes = Math.ceil((rateLimit.resetAt - nowSeconds) / 60);
      const waitText = waitMinutes > 60
        ? `${Math.ceil(waitMinutes / 60)} hour${Math.ceil(waitMinutes / 60) > 1 ? "s" : ""}`
        : `${waitMinutes} minute${waitMinutes > 1 ? "s" : ""}`;
      throw error(
        429,
        `Export rate limit exceeded. You can export ${RATE_LIMIT_MAX} times per hour. ` +
          `Try again in ${waitText}.`
      );
    }

    // Check export size to prevent memory issues with very large datasets
    // Tenants with >5000 items should contact support for bulk exports
    const MAX_EXPORT_ITEMS = 5000;
    if (exportType === "full" || exportType === "posts") {
      const postCount = await platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?"
      ).bind(tenantId).first<{ count: number }>();

      if (postCount && postCount.count > MAX_EXPORT_ITEMS) {
        throw error(
          413,
          `Export too large (${postCount.count} posts). Please contact support for bulk data exports.`
        );
      }
    }

    if (exportType === "full" || exportType === "media") {
      const mediaCount = await platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM image_hashes WHERE tenant_id = ?"
      ).bind(tenantId).first<{ count: number }>();

      if (mediaCount && mediaCount.count > MAX_EXPORT_ITEMS) {
        throw error(
          413,
          `Export too large (${mediaCount.count} media files). Please contact support for bulk data exports.`
        );
      }
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
         ORDER BY created_at DESC`
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
         ORDER BY display_order ASC`
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
         ORDER BY uploaded_at DESC`
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
         VALUES (?, ?, ?, ?, ?, ?, ?)`
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
          Math.floor(Date.now() / 1000)
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
        "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetAt.toString(),
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error exporting data:", err);
    throw error(500, "Failed to export data");
  }
};
