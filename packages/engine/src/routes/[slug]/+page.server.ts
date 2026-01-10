import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import type { PageServerLoad } from "./$types.js";

interface Header {
  level: number;
  id: string;
  text: string;
}

interface GutterItem {
  type?: string;
  content?: string;
  [key: string]: unknown;
}

interface HeroData {
  title?: string;
  subtitle?: string;
  cta?: {
    text: string;
    link: string;
  };
}

interface PageData {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  markdown_content?: string;
  html_content?: string;
  hero?: string;
  gutter_content?: string;
  font?: string;
}

/**
 * Dynamic page route for tenant pages stored in D1
 * Handles /about, /contact, /services, and any custom pages
 */
export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const { slug } = params;
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;

  // Reserved slugs that have their own routes
  const reservedSlugs = [
    "blog",
    "admin",
    "auth",
    "verify",
    "terrarium",
    "vineyard",
  ];
  if (reservedSlugs.includes(slug)) {
    throw error(404, "Page not found");
  }

  if (!db || !tenantId) {
    throw error(404, "Page not found");
  }

  try {
    const pageData = (await db
      .prepare(
        `SELECT id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font
         FROM pages
         WHERE tenant_id = ? AND slug = ?`,
      )
      .bind(tenantId, slug)
      .first()) as PageData | null;

    if (!pageData) {
      throw error(404, "Page not found");
    }

    // Parse hero JSON
    let hero: HeroData | null = null;
    if (pageData.hero && typeof pageData.hero === "string") {
      try {
        hero = JSON.parse(pageData.hero);
      } catch (e) {
        console.warn(`Failed to parse hero for page ${slug}:`, e);
        hero = null;
      }
    }

    // Generate HTML from markdown if not stored
    let htmlContent = pageData.html_content;
    if (
      !htmlContent &&
      pageData.markdown_content &&
      typeof pageData.markdown_content === "string"
    ) {
      htmlContent = sanitizeMarkdown(
        marked.parse(pageData.markdown_content, { async: false }) as string,
      );
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
        gutterContent = JSON.parse(pageData.gutter_content);
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
        console.warn(`Failed to parse gutter_content for page ${slug}:`, e);
        gutterContent = [];
      }
    }

    return {
      page: {
        id: pageData.id,
        slug: pageData.slug,
        title: pageData.title,
        description: pageData.description || "",
        type: pageData.type || "page",
        hero,
        content: htmlContent || "",
        headers,
        gutterContent,
        font: pageData.font || "default",
      },
    };
  } catch (err) {
    // Pass through HTTP errors
    if ((err as { status?: number }).status) throw err;
    console.error(`Error loading page ${slug}:`, err);
    throw error(500, "Failed to load page");
  }
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
