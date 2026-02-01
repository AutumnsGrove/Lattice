import {
  getHomePage,
  getLatestPost,
  processAnchorTags,
  renderMarkdown,
  type GutterItem,
} from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - latest post is fetched from D1 at runtime
export const prerender = false;

interface Header {
  level: number;
  id: string;
  text: string;
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
  slug: string;
  title: string;
  description: string;
  markdown_content?: string;
  html_content?: string;
  hero?: string;
  gutter_content?: string;
  font?: string;
}

interface PostData {
  slug: string;
  title: string;
  published_at?: string;
  date?: string;
  tags?: string;
  description?: string;
  html_content?: string;
  gutter_content?: string;
  font?: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  let page: {
    slug: string;
    title: string;
    description: string;
    hero?: HeroData | null;
    content: string;
    headers: Header[];
    gutterContent: GutterItem[];
    font?: string;
  } | null = null;
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;

  // Run home page and latest post queries in parallel (100-300ms savings)
  let pageData: PageData | null = null;
  let postData: PostData | null = null;

  if (db && tenantId) {
    try {
      [pageData, postData] = await Promise.all([
        db
          .prepare(
            `SELECT slug, title, description, markdown_content, html_content, hero, gutter_content, font
           FROM pages
           WHERE tenant_id = ? AND slug = ?`,
          )
          .bind(tenantId, "home")
          .first<PageData>(),

        db
          .prepare(
            `SELECT slug, title, published_at as date, tags, description, html_content, gutter_content
           FROM posts
           WHERE tenant_id = ? AND status = 'published'
           ORDER BY published_at DESC
           LIMIT 1`,
          )
          .bind(tenantId)
          .first<PostData>(),
      ]);
    } catch (err) {
      console.error("D1 fetch error for home page data:", err);
      // Fall through to filesystem fallback
    }
  }

  // Process home page data
  if (pageData) {
    // Parse hero JSON
    let hero: HeroData | null = null;
    if (pageData.hero && typeof pageData.hero === "string") {
      try {
        hero = JSON.parse(pageData.hero);
      } catch (e) {
        console.warn("Failed to parse hero for home page:", e);
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
        gutterContent = JSON.parse(pageData.gutter_content);
        // Process gutter items: convert markdown to HTML for comment/markdown items
        gutterContent = gutterContent.map((item: GutterItem) => {
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
        console.warn("Failed to parse gutter_content for home page:", e);
        gutterContent = [];
      }
    }

    page = {
      slug: pageData.slug,
      title: pageData.title,
      description: pageData.description || "",
      hero,
      content: htmlContent || "",
      headers,
      gutterContent,
      font: pageData.font || "default",
    };
  }

  // If no D1 page, fall back to filesystem (for local dev or if D1 is empty)
  if (!page) {
    const fsPage = getHomePage();
    if (fsPage) {
      page = {
        slug: fsPage.slug,
        title: fsPage.title,
        description: fsPage.description,
        hero: fsPage.hero,
        content: fsPage.content,
        headers: fsPage.headers,
        gutterContent: fsPage.gutterContent || [],
      };
    }
  }

  // If no page content exists, check if this is a valid tenant that needs setup
  if (!page) {
    const context = locals.context;
    if (context?.type === "tenant" && context.tenant) {
      // Valid tenant but no content - show setup page
      return {
        needsSetup: true,
        tenantName: context.tenant.name,
        tenantSubdomain: context.tenant.subdomain,
        title: "Welcome",
        description: "Set up your new blog",
      };
    }
    throw error(404, "Home page not found");
  }

  // Process latest post data
  let latestPost: {
    slug: string;
    title: string;
    date: string;
    tags: string[];
    description: string;
    content: string;
    headers: Header[];
    gutterContent: GutterItem[];
    font?: string;
  } | null = null;

  if (postData) {
    // Process anchor tags in HTML content (same as individual post pages)
    const processedHtml = processAnchorTags(
      String(postData.html_content || ""),
    );

    // Extract headers from HTML for table of contents
    const headers = extractHeadersFromHtml(processedHtml);

    // Safe JSON parsing for tags
    let tags: string[] = [];
    if (postData.tags && typeof postData.tags === "string") {
      try {
        tags = JSON.parse(postData.tags);
      } catch (e) {
        console.warn("Failed to parse tags for latest post:", e);
        tags = [];
      }
    }

    // Safe JSON parsing for gutter content
    let gutterContent: GutterItem[] = [];
    if (
      postData.gutter_content &&
      typeof postData.gutter_content === "string"
    ) {
      try {
        gutterContent = JSON.parse(postData.gutter_content);
        // Process gutter items: convert markdown to HTML for comment/markdown items
        gutterContent = gutterContent.map((item: GutterItem) => {
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
        console.warn("Failed to parse gutter_content for latest post:", e);
        gutterContent = [];
      }
    }

    latestPost = {
      slug: postData.slug,
      title: postData.title,
      // Convert unix timestamp (seconds) to ISO string for frontend
      date: postData.date
        ? new Date((postData.date as unknown as number) * 1000).toISOString()
        : "",
      tags,
      description: postData.description || "",
      content: processedHtml,
      headers,
      gutterContent,
      font: postData.font || "default",
    };
  }

  // If no D1 post, fall back to filesystem (for local dev or if D1 is empty)
  if (!latestPost) {
    const fsPost = getLatestPost();
    if (fsPost) {
      latestPost = {
        slug: fsPost.slug,
        title: fsPost.title,
        date: fsPost.date,
        tags: fsPost.tags,
        description: fsPost.description,
        content: fsPost.content,
        headers: fsPost.headers,
        gutterContent: fsPost.gutterContent || [],
      };
    }
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
