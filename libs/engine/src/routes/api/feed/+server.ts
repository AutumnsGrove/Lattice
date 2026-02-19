/**
 * RSS 2.0 Feed Endpoint
 *
 * Primary path: D1 database (published posts with full HTML content)
 * Fallback path: Static markdown content loader (legacy/prerender)
 *
 * Includes content:encoded for Meadow poller consumption.
 * Supports conditional requests via ETag header.
 */
import { getAllPosts, getSiteConfig } from "$lib/utils/markdown.js";
import type { RequestHandler } from "./$types.js";

export const prerender = false;

/** Shape of a published post row from D1 */
interface D1Post {
  slug: string;
  title: string;
  description: string | null;
  html_content: string | null;
  tags: string | null;
  published_at: number;
  featured_image: string | null;
}

export const GET: RequestHandler = async (event) => {
  const context = event.locals.context;
  const db = event.platform?.env?.DB;

  const siteUrl =
    context?.type === "tenant"
      ? `https://${context.tenant.subdomain}.grove.place`
      : context?.type === "app"
        ? `https://${context.app}.grove.place`
        : "https://grove.place";

  // Resolve feed metadata (title, description, author)
  const siteConfig = getSiteConfig();
  let tenantName =
    context?.type === "tenant"
      ? context.tenant.name
      : siteConfig.site?.title || "The Grove";

  if (context?.type === "tenant" && db) {
    try {
      const row = await db
        .prepare(
          "SELECT setting_value FROM site_settings WHERE tenant_id = ? AND setting_key = 'grove_title'",
        )
        .bind(context.tenant.id)
        .first<{ setting_value: string }>();
      if (row?.setting_value) {
        tenantName = row.setting_value;
      }
    } catch {
      // Fall back to tenant name if D1 unavailable
    }
  }

  const feedTitle = `${tenantName} Blog`;
  const feedDescription =
    siteConfig.site?.description ||
    "A personal website for blogging, demonstrating projects, and sharing articles";
  const feedAuthor = siteConfig.owner?.name || "Autumn";
  const feedEmail = siteConfig.owner?.email || "autumn@grove.place";

  // Primary path: query D1 for published posts with full HTML content
  let d1Posts: D1Post[] = [];
  if (context?.type === "tenant" && db) {
    try {
      const result = await db
        .prepare(
          `SELECT slug, title, description, html_content, tags, published_at, featured_image
           FROM posts
           WHERE tenant_id = ? AND status = 'published' AND (meadow_exclude IS NULL OR meadow_exclude != 1)
           ORDER BY published_at DESC
           LIMIT 50`,
        )
        .bind(context.tenant.id)
        .all<D1Post>();
      d1Posts = result.results ?? [];
    } catch {
      // D1 unavailable — fall through to filesystem
    }
  }

  let items: string;
  let etagSource: string;

  if (d1Posts.length > 0) {
    // D1 path: full content with content:encoded
    items = d1Posts
      .map((post) => {
        const normalizedSlug = post.slug
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        // published_at is stored as Unix seconds — convert to ms
        const pubDate = new Date(post.published_at * 1000).toUTCString();

        const tags = parseTags(post.tags);
        const categoryElements =
          tags.length > 0
            ? tags
                .map((tag) => `      <category>${escapeXml(tag)}</category>`)
                .join("\n")
            : "";

        const enclosure = buildEnclosure(post.featured_image);

        // content:encoded carries the full HTML for Meadow consumption
        const contentEncoded = post.html_content
          ? `\n      <content:encoded><![CDATA[${post.html_content}]]></content:encoded>`
          : "";

        return `
    <item>
      <title><![CDATA[${escapeXml(post.title)}]]></title>
      <link>${siteUrl}/garden/${normalizedSlug}</link>
      <guid isPermaLink="true">${siteUrl}/garden/${normalizedSlug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeXml(post.description || "")}]]></description>
${categoryElements}${enclosure}${contentEncoded}
    </item>`;
      })
      .join("");

    // ETag from latest post timestamp + count for conditional polling
    const latestTs = d1Posts[0].published_at;
    etagSource = `${latestTs}-${d1Posts.length}`;
  } else {
    // Fallback: static filesystem content (no html_content available)
    const posts = getAllPosts();
    const sortedPosts = posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    items = sortedPosts
      .map((post) => {
        const normalizedSlug = post.slug
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        const enclosure = buildEnclosure(post.featured_image);
        const categoryElements =
          post.tags && post.tags.length > 0
            ? post.tags
                .map((tag) => `      <category>${escapeXml(tag)}</category>`)
                .join("\n")
            : "";

        return `
    <item>
      <title><![CDATA[${escapeXml(post.title)}]]></title>
      <link>${siteUrl}/garden/${normalizedSlug}</link>
      <guid isPermaLink="true">${siteUrl}/garden/${normalizedSlug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${escapeXml(post.description || "")}]]></description>
${categoryElements}${enclosure}
    </item>`;
      })
      .join("");

    etagSource = `fs-${sortedPosts.length}-${Date.now()}`;
  }

  // Generate ETag for conditional polling
  const etag = await generateETag(etagSource);

  // Handle conditional requests (If-None-Match)
  const ifNoneMatch = event.request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/feed" rel="self" type="application/rss+xml"/>
    <managingEditor>${feedEmail} (${escapeXml(feedAuthor)})</managingEditor>
    <webMaster>${feedEmail} (${escapeXml(feedAuthor)})</webMaster>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "max-age=3600, s-maxage=3600",
      ETag: etag,
    },
  });
};

/** Parse tags from D1 JSON string or return empty array */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Build RSS enclosure element for a featured image */
function buildEnclosure(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  const ext = imageUrl.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    jxl: "image/jxl",
    svg: "image/svg+xml",
  };
  const mimeType = mimeTypes[ext] || "image/jpeg";
  return `\n      <enclosure url="${escapeXml(imageUrl)}" type="${mimeType}" length="0" />`;
}

/** Generate a weak ETag from a source string using SHA-256 */
async function generateETag(source: string): Promise<string> {
  const data = new TextEncoder().encode(source);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `W/"${hex}"`;
}

/** Escape special characters for XML */
function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
