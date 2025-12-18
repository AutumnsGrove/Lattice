import {
  getHomePage,
  getLatestPost,
  processAnchorTags,
} from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";

// Disable prerendering - latest post is fetched from D1 at runtime
export const prerender = false;

export async function load({ platform, locals }) {
  let page = null;
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;

  // Try D1 first for the home page
  if (db && tenantId) {
    // Multi-tenant mode: load tenant-specific content
    try {
      const pageData = await db
        .prepare(
          `SELECT slug, title, description, markdown_content, html_content, hero, gutter_content, font
         FROM pages
         WHERE tenant_id = ? AND slug = ?`,
        )
        .bind(tenantId, "home")
        .first();

      if (pageData) {
        // Parse hero JSON
        let hero = null;
        if (pageData.hero && typeof pageData.hero === 'string') {
          try {
            hero = JSON.parse(pageData.hero);
          } catch (/** @type {unknown} */ e) {
            console.warn("Failed to parse hero for home page:", e);
            hero = null;
          }
        }

        // Generate HTML from markdown if not stored
        let htmlContent = pageData.html_content;
        if (!htmlContent && pageData.markdown_content && typeof pageData.markdown_content === 'string') {
          htmlContent = sanitizeMarkdown(
            /** @type {string} */ (marked.parse(pageData.markdown_content, { async: false })),
          );
        }

        // Extract headers from HTML for table of contents
        const headers = extractHeadersFromHtml(String(htmlContent || ""));

        // Safe JSON parsing for gutter content
        let gutterContent = [];
        if (pageData.gutter_content && typeof pageData.gutter_content === 'string') {
          try {
            gutterContent = JSON.parse(pageData.gutter_content);
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
          } catch (/** @type {unknown} */ e) {
            console.warn("Failed to parse gutter_content for home page:", e);
            gutterContent = [];
          }
        }

        page = {
          slug: pageData.slug,
          title: pageData.title,
          description: pageData.description || "",
          hero,
          content: htmlContent,
          headers,
          gutterContent,
          font: pageData.font || "default",
        };
      }
    } catch (/** @type {unknown} */ err) {
      console.error("D1 fetch error for home page:", err);
      // Fall through to filesystem fallback
    }
  }

  // If no D1 page, fall back to filesystem (for local dev or if D1 is empty)
  if (!page) {
    page = getHomePage();
  }

  if (!page) {
    throw error(404, "Home page not found");
  }

  let latestPost = null;

  // Try D1 first for the latest post
  if (db && tenantId) {
    // Multi-tenant mode: load tenant-specific latest post
    try {
      const post = await db
        .prepare(
          `SELECT slug, title, published_at as date, tags, description, html_content, gutter_content
         FROM posts
         WHERE tenant_id = ? AND status = 'published'
         ORDER BY published_at DESC
         LIMIT 1`,
        )
        .bind(tenantId)
        .first();

      if (post) {
        // Process anchor tags in HTML content (same as individual post pages)
        const processedHtml = processAnchorTags(String(post.html_content || ""));

        // Extract headers from HTML for table of contents
        const headers = extractHeadersFromHtml(processedHtml);

        // Safe JSON parsing for tags
        let tags = [];
        if (post.tags && typeof post.tags === 'string') {
          try {
            tags = JSON.parse(post.tags);
          } catch (/** @type {unknown} */ e) {
            console.warn("Failed to parse tags for latest post:", e);
            tags = [];
          }
        }

        // Safe JSON parsing for gutter content
        let gutterContent = [];
        if (post.gutter_content && typeof post.gutter_content === 'string') {
          try {
            gutterContent = JSON.parse(post.gutter_content);
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
          } catch (/** @type {unknown} */ e) {
            console.warn("Failed to parse gutter_content for latest post:", e);
            gutterContent = [];
          }
        }

        latestPost = {
          slug: post.slug,
          title: post.title,
          date: post.date,
          tags,
          description: post.description || "",
          content: processedHtml,
          headers,
          gutterContent,
          font: post.font || "default",
        };
      }
    } catch (/** @type {unknown} */ err) {
      console.error("D1 fetch error for latest post:", err);
      // Fall through to filesystem fallback
    }
  }

  // If no D1 post, fall back to filesystem (for local dev or if D1 is empty)
  if (!latestPost) {
    latestPost = getLatestPost();
  }

  return {
    title: page.title,
    description: page.description,
    hero: page.hero,
    content: page.content,
    headers: page.headers,
    gutterContent: page.gutterContent,
    latestPost,
  };
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
