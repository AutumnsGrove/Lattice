import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import {
  extractHeaders,
  type GutterItem,
  type Header,
} from "$lib/utils/markdown.js";
import type { PageServerLoad } from "./$types.js";

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
    const rawMarkdown = pageData.markdown_content || "";
    if (!htmlContent && rawMarkdown && typeof rawMarkdown === "string") {
      htmlContent = sanitizeMarkdown(
        marked.parse(rawMarkdown, { async: false }) as string,
      );
    }

    // Extract headers from raw markdown for table of contents
    // Note: ContentWithGutter will add IDs to headers client-side based on this data
    const headers = extractHeaders(rawMarkdown);

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
        // Process gutter items: convert markdown to HTML for comment/markdown items
        gutterContent = parsedGutter.map((item) => {
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
