import { getPostBySlug, processAnchorTags } from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";

// Disable prerendering - D1 posts are fetched dynamically at runtime
export const prerender = false;

export async function load({ params, locals, platform }) {
  const { slug } = params;
  const tenantId = locals?.tenantId;

  try {
    // Try D1 first for posts created via admin panel
    if (platform?.env?.DB) {
      try {
        const post = await platform.env.DB.prepare(
          `SELECT slug, title, description, html_content, gutter_content, tags, status, published_at
					 FROM posts WHERE slug = ? AND tenant_id = ? AND status = 'published'`,
        )
          .bind(slug, tenantId)
          .first();

        if (post) {
          // Process anchor tags in HTML content (same as filesystem posts)
          const processedHtml = processAnchorTags(/** @type {string} */ (post.html_content) || "");

          // Extract headers from HTML for table of contents
          // Note: For D1 posts, we extract from HTML since we don't store raw markdown
          const headers = extractHeadersFromHtml(processedHtml);

          // Safe JSON parsing for tags
          let tags = [];
          if (post.tags) {
            try {
              tags = JSON.parse(/** @type {string} */ (post.tags));
            } catch (e) {
              console.warn("Failed to parse tags:", e);
              tags = [];
            }
          }

          // Safe JSON parsing for gutter content
          let gutterContent = [];
          if (post.gutter_content) {
            try {
              gutterContent = JSON.parse(/** @type {string} */ (post.gutter_content));
              // Process gutter items: convert markdown to HTML for comment/markdown items
              gutterContent = gutterContent.map((/** @type {{ type?: string; content?: string; [key: string]: unknown }} */ item) => {
                if (
                  (item.type === "comment" || item.type === "markdown") &&
                  item.content
                ) {
                  return {
                    ...item,
                    content: sanitizeMarkdown(/** @type {string} */ (marked.parse(item.content, { async: false }))),
                  };
                }
                return item;
              });
            } catch (e) {
              console.warn("Failed to parse gutter_content:", e);
              gutterContent = [];
            }
          }

          return {
            post: {
              slug: /** @type {string} */ (post.slug),
              title: /** @type {string} */ (post.title),
              date: /** @type {string} */ (post.published_at),
              tags,
              description: /** @type {string} */ (post.description) || "",
              content: processedHtml,
              headers,
              gutterContent,
              font: "default",
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
        // Add default font for filesystem posts
        return {
          post: {
            ...post,
            font: "default",
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
    if (/** @type {{ status?: number }} */ (err)?.status) {
      throw err;
    }
    // Log and rethrow as 500 with message for debugging
    console.error("Blog post load error:", err);
    throw error(500, `Failed to load post: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * @typedef {Object} Header
 * @property {number} level
 * @property {string} id
 * @property {string} text
 */

/**
 * Extract headers from HTML content for table of contents
 * Used for D1 posts where raw markdown isn't stored
 * @param {string} html - The HTML content
 * @returns {Header[]} Array of header objects with level, text, and id
 */
function extractHeadersFromHtml(html) {
  const headers = [];
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
