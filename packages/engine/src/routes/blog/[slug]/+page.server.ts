import {
  getPostBySlug,
  processAnchorTags,
  extractHeaders,
  generateHeadingId,
  type GutterItem,
} from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import { marked, type Tokens } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
import { getTenantDb } from "$lib/server/services/database.js";
import * as cache from "$lib/server/services/cache.js";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - D1 posts are fetched dynamically at runtime
export const prerender = false;

interface Header {
  level: number;
  id: string;
  text: string;
}

/**
 * Strip HTML tags from text to get plain text content.
 * In marked v5+, the heading renderer receives `text` with rendered HTML
 * (e.g., `Hello <strong>World</strong>` instead of `Hello **World**`).
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
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

/** Cached post data - the fully processed result */
interface CachedPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  content: string;
  headers: Header[];
  gutterContent: GutterItem[];
  font: string;
  author: string;
}

/** Cache configuration */
const CACHE_TTL_SECONDS = 300; // 5 minutes for KV cache

export const load: PageServerLoad = async ({
  params,
  locals,
  platform,
  setHeaders,
}) => {
  const { slug } = params;
  const tenantId = locals?.tenantId;

  // Get author name from context (needed for cache key and response)
  const context = locals.context;
  const authorName =
    context?.type === "tenant" ? context.tenant.name : "Grove Author";

  // Cache key includes tenant for multi-tenant isolation
  const cacheKey = tenantId ? `blog:${tenantId}:${slug}` : `blog:_:${slug}`;

  try {
    // Try to get from KV cache first, or compute from D1/filesystem
    const kv = platform?.env?.CACHE_KV;
    const db = platform?.env?.DB;

    // If we have KV, use getOrSet pattern for caching
    if (kv && db && tenantId) {
      const cachedPost = await cache.getOrSet<CachedPost | null>(kv, cacheKey, {
        ttl: CACHE_TTL_SECONDS,
        compute: async () => {
          return await fetchAndProcessPost(slug, tenantId, db, authorName);
        },
      });

      if (cachedPost) {
        // Set Cache-Control headers for edge caching (published posts only)
        setHeaders({
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "CDN-Cache-Control": "max-age=3600, stale-while-revalidate=86400",
          Vary: "Cookie",
        });

        return { post: cachedPost };
      }
    } else if (db && tenantId) {
      // No KV available, fall back to direct D1 (no caching)
      const post = await fetchAndProcessPost(slug, tenantId, db, authorName);
      if (post) {
        return { post };
      }
    }

    // Fall back to filesystem (UserContent) for local dev
    if (typeof globalThis.Buffer !== "undefined") {
      const post = getPostBySlug(slug);

      if (post) {
        return {
          post: {
            ...post,
            font: "default",
            author: authorName,
          },
        };
      }
    }

    // Post not found
    if (!db) {
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
    // Log and rethrow as 500
    console.error("Blog post load error:", err);
    throw error(
      500,
      `Failed to load post: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

/**
 * Fetch post from D1 and process it (markdown, headers, gutter content)
 * This is the "compute" function for cache.getOrSet()
 */
async function fetchAndProcessPost(
  slug: string,
  tenantId: string,
  db: D1Database,
  authorName: string,
): Promise<CachedPost | null> {
  const tenantDb = getTenantDb(db, { tenantId });

  const post = await tenantDb.queryOne<PostRecord>(
    "posts",
    "slug = ? AND status = ?",
    [slug, "published"],
  );

  if (!post) {
    return null;
  }

  // Extract headers from markdown for TOC (this generates IDs)
  const headers = post.markdown_content
    ? extractHeaders(post.markdown_content)
    : [];

  // Generate HTML from markdown if not stored
  let htmlContent = post.html_content;
  if (!htmlContent && post.markdown_content) {
    // Create a custom renderer that adds IDs to headings
    const renderer = new marked.Renderer();
    renderer.heading = function (token: Tokens.Heading): string {
      const text = token.text;
      const level = token.depth;
      // Strip HTML tags and generate ID to match extractHeaders
      const plainText = stripHtmlTags(text);
      const id = generateHeadingId(plainText);
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    htmlContent = sanitizeMarkdown(
      marked.parse(post.markdown_content, { async: false, renderer }) as string,
    );
  }

  // Process anchor tags
  const processedHtml = processAnchorTags(htmlContent || "");

  // Parse tags
  let tags: string[] = [];
  if (post.tags) {
    try {
      tags = JSON.parse(post.tags as string);
    } catch {
      tags = [];
    }
  }

  // Parse and process gutter content
  let gutterContent: GutterItem[] = [];
  if (post.gutter_content) {
    try {
      gutterContent = JSON.parse(post.gutter_content as string);
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
    } catch {
      gutterContent = [];
    }
  }

  return {
    slug: post.slug as string,
    title: post.title as string,
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
  };
}
