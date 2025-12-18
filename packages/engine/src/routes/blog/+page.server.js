import { getAllPosts } from "$lib/utils/markdown.js";

// Disable prerendering - posts are fetched from D1 at runtime
// This also ensures user auth state is available for the admin link
export const prerender = false;

export async function load({ locals, platform }) {
  /** @type {Array<{ slug: string; title: string; date: string; tags: string[]; description: string }>} */
  let posts = [];
  const tenantId = locals.tenantId;
  const db = platform?.env?.DB;

  // Try D1 database first (multi-tenant mode)
  if (db && tenantId) {
    try {
      const result = await db
        .prepare(
          `SELECT slug, title, published_at, tags, description
				 FROM posts
				 WHERE tenant_id = ? AND status = 'published'
				 ORDER BY published_at DESC`,
        )
        .bind(tenantId)
        .all();

      posts = result.results.map((post) => ({
        slug: /** @type {string} */ (post.slug),
        title: /** @type {string} */ (post.title),
        date: /** @type {string} */ (post.published_at),
        tags: post.tags ? JSON.parse(/** @type {string} */ (post.tags)) : [],
        description: /** @type {string} */ (post.description) || "",
      }));
    } catch (err) {
      console.error("D1 fetch error for posts list:", err);
      // Fall through to filesystem fallback
    }
  }

  // If no D1 posts, fall back to filesystem (for local dev or if D1 is empty)
  if (posts.length === 0) {
    posts = getAllPosts();
  }

  return {
    posts,
    user: locals.user || null,
  };
}
