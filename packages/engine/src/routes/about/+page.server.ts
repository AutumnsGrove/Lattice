import {
  getAboutPage,
  type GutterItem,
  renderMarkdown,
} from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - content is fetched from D1 at runtime for tenants
export const prerender = false;

interface Header {
  level: number;
  id: string;
  text: string;
}

interface PageData {
  slug: string;
  title: string;
  description: string;
  markdown_content?: string;
  html_content?: string;
  gutter_content?: string;
  font?: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;

  // Try D1 first for multi-tenant mode
  if (db && tenantId) {
    try {
      const pageData = (await db
        .prepare(
          `SELECT slug, title, description, markdown_content, html_content, gutter_content, font
           FROM pages
           WHERE tenant_id = ? AND slug = 'about'`,
        )
        .bind(tenantId)
        .first()) as PageData | null;

      if (pageData) {
        // Generate HTML from markdown if not stored
        let htmlContent = pageData.html_content;
        if (
          !htmlContent &&
          pageData.markdown_content &&
          typeof pageData.markdown_content === "string"
        ) {
          htmlContent = renderMarkdown(pageData.markdown_content);
        }

        // Extract headers from HTML for table of contents
        const headers = extractHeadersFromHtml(String(htmlContent || ""));

        // Safe JSON parsing for gutter content
        let gutterContent: GutterItem[] = [];
        if (
          pageData.gutter_content &&
          typeof pageData.gutter_content === "string"
        ) {
          try {
            const parsedGutter = JSON.parse(
              pageData.gutter_content,
            ) as GutterItem[];
            // Process gutter items: convert markdown to HTML
            gutterContent = parsedGutter.map((item) => {
              if (
                (item.type === "comment" || item.type === "markdown") &&
                item.content
              ) {
                return {
                  ...item,
                  content: renderMarkdown(item.content),
                };
              }
              return item;
            });
          } catch (e) {
            console.warn("Failed to parse gutter_content for about page:", e);
            gutterContent = [];
          }
        }

        return {
          page: {
            slug: pageData.slug,
            title: pageData.title,
            description: pageData.description || "",
            content: htmlContent || "",
            headers,
            gutterContent,
            font: pageData.font || "default",
          },
        };
      }
    } catch (err) {
      console.error("D1 fetch error for about page:", err);
      // Fall through to filesystem fallback
    }
  }

  // Fallback to filesystem (for local dev or if D1 is empty)
  const page = getAboutPage();

  if (!page) {
    throw error(404, "About page not found");
  }

  return {
    page,
  };
};

/**
 * Extract headers from HTML content for table of contents
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
