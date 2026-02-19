import {
  getPostBySlug,
  processAnchorTags,
  extractHeaders,
  renderMarkdown,
  type GutterItem,
} from "$lib/utils/markdown.js";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";
import { getTenantDb } from "$lib/server/services/database.js";
import * as cache from "$lib/server/services/cache.js";
import { emailsMatch } from "$lib/utils/user.js";
import {
  getApprovedComments,
  getCommentCount,
  getCommentSettings,
  buildCommentTree,
} from "$lib/server/services/reeds.js";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags/index.js";
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
  featured_image?: string;
  storage_location?: string;
  r2_key?: string;
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
  featured_image?: string;
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

  // Determine if logged-in user is the tenant owner (can edit this post)
  const isOwner =
    locals.user &&
    context?.type === "tenant" &&
    emailsMatch(context.tenant.ownerId, locals.user.email);

  // Cache key includes tenant for multi-tenant isolation
  const cacheKey = tenantId ? `garden:${tenantId}:${slug}` : `garden:_:${slug}`;

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

        // Load comments (not cached — always fresh from D1)
        const { comments, commentTotal, commentSettings } = await loadComments(
          db,
          tenantId,
          slug,
          kv,
        );
        return {
          post: cachedPost,
          isOwner: isOwner || false,
          comments,
          commentTotal,
          commentSettings,
        };
      }
    } else if (db && tenantId) {
      // No KV available, fall back to direct D1 (no caching)
      const post = await fetchAndProcessPost(slug, tenantId, db, authorName);
      if (post) {
        const { comments, commentTotal, commentSettings } = await loadComments(
          db,
          tenantId,
          slug,
        );
        return {
          post,
          isOwner: isOwner || false,
          comments,
          commentTotal,
          commentSettings,
        };
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
          isOwner: isOwner || false,
          comments: [],
          commentTotal: 0,
          commentSettings: null,
        };
      }
    }

    // Post not found
    if (!db) {
      console.error(
        "DB binding not available - check Cloudflare Pages D1 bindings",
      );
    }
    throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, "Site");
  } catch (err) {
    // If it's already a SvelteKit error, rethrow it
    if ((err as { status?: number })?.status) {
      throw err;
    }
    // Log and rethrow as 500
    console.error("Blog post load error:", err);
    throwGroveError(500, SITE_ERRORS.POST_LOAD_FAILED, "Site");
  }
};

/**
 * Load Reeds comments for a blog post.
 * Fails gracefully — comments are non-critical for page rendering.
 * Returns empty data when the reeds_comments graft is disabled.
 */
async function loadComments(
  db: D1Database,
  tenantId: string,
  slug: string,
  kv?: KVNamespace,
) {
  try {
    // Gate: reeds_comments graft — skip loading if feature is off
    // When KV is unavailable, default to disabled (can't verify graft)
    if (!kv) {
      return { comments: [], commentTotal: 0, commentSettings: null };
    }
    const flagsEnv = { DB: db, FLAGS_KV: kv };
    const inGreenhouse = await isInGreenhouse(tenantId, flagsEnv).catch(
      () => false,
    );
    if (!inGreenhouse) {
      return { comments: [], commentTotal: 0, commentSettings: null };
    }
    const reedsEnabled = await isFeatureEnabled(
      "reeds_comments",
      { tenantId, inGreenhouse: true },
      flagsEnv,
    ).catch(() => false);
    if (!reedsEnabled) {
      return { comments: [], commentTotal: 0, commentSettings: null };
    }

    const tenantDb = getTenantDb(db, { tenantId });

    // Get the post ID from slug
    const post = await tenantDb.queryOne<{ id: string }>("posts", "slug = ?", [
      slug,
    ]);

    if (!post) {
      return { comments: [], commentTotal: 0, commentSettings: null };
    }

    const [rawComments, commentTotal, commentSettings] = await Promise.all([
      getApprovedComments(tenantDb, post.id).catch(() => []),
      getCommentCount(tenantDb, post.id).catch(() => 0),
      getCommentSettings(tenantDb).catch(() => null),
    ]);

    const comments = buildCommentTree(rawComments);

    return { comments, commentTotal, commentSettings };
  } catch (err) {
    console.error("[Reeds] Failed to load comments:", err);
    return { comments: [], commentTotal: 0, commentSettings: null };
  }
}

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

  // Detect posts whose content was migrated to cold storage (R2).
  // The storage tier migration system has been disabled, but posts that were
  // already migrated will have empty content in D1. Log a clear warning so
  // this is diagnosable, and show a fallback message instead of a blank page.
  if (
    post.storage_location &&
    post.storage_location !== "hot" &&
    !post.markdown_content &&
    !post.html_content
  ) {
    console.error(
      `[garden] Post "${post.slug}" has storage_location="${post.storage_location}" ` +
        `with empty content in D1. Content may be in R2 at key: ${post.r2_key || "unknown"}. ` +
        `Run the recovery migration to restore content from R2 back to D1.`,
    );
  }

  // Extract headers from markdown for TOC (this generates IDs)
  const headers = post.markdown_content
    ? extractHeaders(post.markdown_content)
    : [];

  // Generate HTML from markdown if not stored
  let htmlContent = post.html_content;
  if (!htmlContent && post.markdown_content) {
    // renderMarkdown handles heading IDs and sanitization
    htmlContent = renderMarkdown(post.markdown_content);
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
            content: renderMarkdown(item.content),
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
    featured_image: (post.featured_image as string) || undefined,
  };
}
