import { getAllPosts } from "$lib/utils/markdown.js";
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

export const load: PageServerLoad = async ({ locals, platform }) => {
  let posts: PostMeta[] = [];
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
        slug: post.slug as string,
        title: post.title as string,
        // Convert unix timestamp (seconds) to ISO string for frontend
        date: post.published_at
          ? new Date((post.published_at as number) * 1000).toISOString()
          : new Date().toISOString(),
        tags: post.tags ? JSON.parse(post.tags as string) : [],
        description: (post.description as string) || "",
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
};
