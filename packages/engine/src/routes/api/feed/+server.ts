import { getAllPosts, getSiteConfig } from "$lib/utils/markdown.js";
import type { RequestHandler } from "./$types.js";

export const prerender = false;

export const GET: RequestHandler = (event) => {
  const posts = getAllPosts();
  const siteConfig = getSiteConfig();

  // Sort by date descending
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Get site URL from tenant context (dynamic per-tenant)
  const context = event.locals.context;
  const siteUrl =
    context?.type === "tenant"
      ? `https://${context.tenant.subdomain}.grove.place`
      : context?.type === "app"
        ? `https://${context.app}.grove.place`
        : "https://grove.place";
  const feedTitle = `${siteConfig.site?.title || "AutumnsGrove"} Blog`;
  const feedDescription =
    siteConfig.site?.description ||
    "A personal website for blogging, demonstrating projects, and sharing articles";
  const feedAuthor = siteConfig.owner?.name || "Autumn";
  const feedEmail = siteConfig.owner?.email || "autumn@grove.place";

  const items = sortedPosts
    .map((post) => {
      // Normalize slug for URL (lowercase kebab-case)
      const normalizedSlug = post.slug
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      return `
    <item>
      <title><![CDATA[${escapeXml(post.title)}]]></title>
      <link>${siteUrl}/blog/${normalizedSlug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${normalizedSlug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${escapeXml(post.description || "")}]]></description>
      ${post.tags && post.tags.length > 0 ? post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n      ") : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
    },
  });
};

/**
 * Escape special characters for XML
 */
function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
