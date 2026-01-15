import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";

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
 */

export type ExportType = "full" | "posts" | "media" | "pages";

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

/**
 * GET /api/export?type=full|posts|media|pages
 *
 * Returns exported data as JSON (for now).
 * Future: Return as ZIP file with markdown files and media.
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const exportType = (url.searchParams.get("type") || "full") as ExportType;
  const validTypes = ["full", "posts", "media", "pages"];

  if (!validTypes.includes(exportType)) {
    throw error(400, `Invalid export type. Valid types: ${validTypes.join(", ")}`);
  }

  const requestedTenantId = url.searchParams.get("tenant_id") || locals.tenantId;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      requestedTenantId,
      locals.user
    );

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

    // Return as JSON with download headers
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="grove-export-${exportType}-${new Date().toISOString().split("T")[0]}.json"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Error exporting data:", err);
    throw error(500, "Failed to export data");
  }
};
