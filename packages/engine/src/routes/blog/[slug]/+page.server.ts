import {
  getPostBySlug,
  processAnchorTags,
  type GutterItem,
} from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getTenantDb } from "$lib/server/services/database.js";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - D1 posts are fetched dynamically at runtime
export const prerender = false;

interface Header {
  level: number;
  id: string;
  text: string;
}

interface PostRecord {
  slug: string;
  title: string;
  description?: string;
  markdown_content?: string;
  html_content?: string;
  gutter_content?: string;
  tags?: string;
  status?: string;
  published_at?: number;
  font?: string;
}

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  const { slug } = params;
  const tenantId = locals?.tenantId;

  try {
    // Try D1 first for posts created via admin panel
    if (platform?.env?.DB && tenantId) {
      try {
        // Use TenantDb for automatic tenant isolation (like the API does)
        const tenantDb = getTenantDb(platform.env.DB, { tenantId });

        const post = await tenantDb.queryOne<PostRecord>(
          "posts",
          "slug = ? AND status = ?",
          [slug, "published"],
        );

        if (post) {
          // Generate HTML from markdown if html_content is not stored
          let htmlContent = post.html_content;
          if (!htmlContent && post.markdown_content) {
            htmlContent = sanitizeMarkdown(
              marked.parse(post.markdown_content, { async: false }) as string,
            );
          }

          // Process anchor tags in HTML content (same as filesystem posts)
          const processedHtml = processAnchorTags(htmlContent || "");

          // Extract headers from HTML for table of contents
          // Note: For D1 posts, we extract from HTML since we don't store raw markdown
          const headers = extractHeadersFromHtml(processedHtml);

          // Safe JSON parsing for tags
          let tags: string[] = [];
          if (post.tags) {
            try {
              tags = JSON.parse(post.tags as string);
            } catch (e) {
              console.warn("Failed to parse tags:", e);
              tags = [];
            }
          }

          // Safe JSON parsing for gutter content
          let gutterContent: GutterItem[] = [];
          if (post.gutter_content) {
            try {
              gutterContent = JSON.parse(post.gutter_content as string);
              // Process gutter items: convert markdown to HTML for comment/markdown items
              gutterContent = gutterContent.map((item: GutterItem) => {
                if (
                  (item.type === "comment" || item.type === "markdown") &&
                  item.content
                ) {
                  return {
                    ...item,
                    content: sanitizeMarkdown(
                      marked.parse(item.content, { async: false }) as string,
                    ),
                  };
                }
                return item;
              });
            } catch (e) {
              console.warn("Failed to parse gutter_content:", e);
              gutterContent = [];
            }
          }

          // Get author name from context
          const context = locals.context;
          const authorName =
            context?.type === "tenant" ? context.tenant.name : "Grove Author";

          return {
            post: {
              slug: post.slug as string,
              title: post.title as string,
              // Convert unix timestamp (seconds) to ISO string for frontend
              date: post.published_at
                ? new Date(post.published_at * 1000).toISOString()
                : new Date().toISOString(),
              tags,
              description: (post.description as string) || "",
              content: processedHtml,
              headers,
              gutterContent,
              font: (post.font as string) || "default",
              author: authorName,
            },
          };
        }
      } catch (err) {
        console.error("D1 fetch error:", err);
        // Fall through to filesystem fallback
      }
    }

    // Fall back to filesystem (UserContent)
    // Note: This uses gray-matter which requires Buffer (Node.js)
    // In Cloudflare Workers environment, this will fail
    // So we only try this if we're NOT in a Workers environment
    if (typeof globalThis.Buffer !== "undefined") {
      const post = getPostBySlug(slug);

      if (post) {
        // Get author name from context
        const context = locals.context;
        const authorName =
          context?.type === "tenant" ? context.tenant.name : "Grove Author";

        // Add default font and author for filesystem posts
        return {
          post: {
            ...post,
            font: "default",
            author: authorName,
          },
        };
      }
    }

    // Post not found in D1 or filesystem
    // If we got here without D1 being available, that's a config issue
    if (!platform?.env?.DB) {
      console.error(
        "DB binding not available - check Cloudflare Pages D1 bindings",
      );
    }
    throw error(404, "Post not found");
  } catch (err) {
    // If it's already a SvelteKit error, rethrow it
    if ((err as { status?: number })?.status) {
      throw err;
    }
    // Log and rethrow as 500 with message for debugging
    console.error("Blog post load error:", err);
    throw error(
      500,
      `Failed to load post: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

/**
 * Extract headers from HTML content for table of contents
 * Used for D1 posts where raw markdown isn't stored
 */
function extractHeadersFromHtml(html: string): Header[] {
  const headers: Header[] = [];
  const headerRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[1-6]>/gi;

  let match;
  while ((match = headerRegex.exec(html)) !== null) {
    headers.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim(),
    });
  }

  return headers;
}
