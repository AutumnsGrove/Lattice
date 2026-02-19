import { getAllPosts } from "$lib/utils/markdown.js";
import * as cache from "$lib/server/services/cache.js";
import { emailsMatch } from "$lib/utils/user.js";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - posts are fetched from D1 at runtime
// This also ensures user auth state is available for the admin link
export const prerender = false;

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
}

/** Cache configuration */
const CACHE_TTL_SECONDS = 900; // 15 minutes for post list

export const load: PageServerLoad = async ({
  locals,
  platform,
  setHeaders,
}) => {
  let posts: PostMeta[] = [];
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;

  // Try to get from cache first, or compute from D1
  if (kv && db && tenantId) {
    const cacheKey = `garden:list:${tenantId}`;

    posts = await cache.getOrSet<PostMeta[]>(kv, cacheKey, {
      ttl: CACHE_TTL_SECONDS,
      compute: async () => {
        const result = await db
          .prepare(
            `SELECT slug, title, published_at, tags, description
             FROM posts
             WHERE tenant_id = ? AND status = 'published'
             ORDER BY published_at DESC
             LIMIT 100`,
          )
          .bind(tenantId)
          .all();

        return result.results.map((post) => ({
          slug: post.slug as string,
          title: post.title as string,
          date: post.published_at
            ? new Date((post.published_at as number) * 1000).toISOString()
            : new Date().toISOString(),
          tags: post.tags ? JSON.parse(post.tags as string) : [],
          description: (post.description as string) || "",
        }));
      },
    });

    // Set Cache-Control headers for edge caching
    setHeaders({
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "CDN-Cache-Control": "max-age=600, stale-while-revalidate=3600",
    });
  } else if (db && tenantId) {
    // No KV available, fall back to direct D1 (no caching)
    try {
      const result = await db
        .prepare(
          `SELECT slug, title, published_at, tags, description
           FROM posts
           WHERE tenant_id = ? AND status = 'published'
           ORDER BY published_at DESC
           LIMIT 100`,
        )
        .bind(tenantId)
        .all();

      posts = result.results.map((post) => ({
        slug: post.slug as string,
        title: post.title as string,
        date: post.published_at
          ? new Date((post.published_at as number) * 1000).toISOString()
          : new Date().toISOString(),
        tags: post.tags ? JSON.parse(post.tags as string) : [],
        description: (post.description as string) || "",
      }));
    } catch (err) {
      console.error("D1 fetch error for posts list:", err);
    }
  }

  // If no D1 posts, fall back to filesystem (for local dev or if D1 is empty)
  if (posts.length === 0) {
    posts = getAllPosts();
  }

  // Determine if logged-in user is the tenant owner (can access admin)
  const isOwner =
    locals.user &&
    locals.context?.type === "tenant" &&
    emailsMatch(locals.context.tenant.ownerId, locals.user.email);

  return {
    posts,
    user: locals.user || null,
    isOwner: isOwner || false,
  };
};
