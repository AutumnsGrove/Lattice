import { getTenantDb } from "$lib/server/services/database";
import type { PageServerLoad } from "./$types";

interface PostRecord {
  slug: string;
  title: string;
  status?: string;
  /** JSON string of tags array */
  tags?: string;
  description?: string;
  /** Unix timestamp in seconds OR ISO string (D1 returns mixed formats) */
  published_at?: number | string;
  updated_at?: number | string;
  created_at?: number | string;
}

interface BlogPost {
  slug: string;
  title: string;
  status: string;
  date: string | null;
  tags: string[];
  description: string;
}

/**
 * Fetch posts from D1 database (multi-tenant)
 */
export const load: PageServerLoad = async ({ platform, locals }) => {
  const isExampleSite = locals.tenantId === "example-tenant-001";

  // Require tenant context
  if (!locals.tenantId) {
    console.error("[Admin Blog] No tenant ID found");
    return { posts: [] as BlogPost[], isExampleSite: false };
  }

  // Require database
  if (!platform?.env?.DB) {
    console.error("[Admin Blog] D1 database not available");
    return { posts: [] as BlogPost[], isExampleSite };
  }

  try {
    // Use TenantDb for automatic tenant scoping
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Fetch posts for this tenant, ordered by publish date descending
    // Limit to 500 to prevent extremely large result sets
    const postsArray = await tenantDb.queryMany<PostRecord>(
      "posts",
      undefined, // No additional WHERE clause (tenant_id is automatic)
      [],
      { orderBy: "published_at DESC, created_at DESC", limit: 500 },
    );

    // Transform posts - parse tags from JSON string
    const posts: BlogPost[] = postsArray.map((post) => {
      // Determine which timestamp to use based on post status
      // For published posts: use published_at
      // For drafts: use updated_at
      // Fallback to created_at if needed
      let rawTimestamp: number | string | undefined;

      if (post.status === "published" && post.published_at) {
        rawTimestamp = post.published_at;
      } else if (post.updated_at) {
        rawTimestamp = post.updated_at;
      } else if (post.created_at) {
        rawTimestamp = post.created_at;
      }

      // Convert timestamp to ISO date string (YYYY-MM-DD)
      // Handle both Unix timestamps (numbers) and ISO strings (from D1)
      let date: string | null = null;
      if (rawTimestamp !== undefined) {
        try {
          if (typeof rawTimestamp === "number") {
            // Unix timestamp in seconds → multiply by 1000 for milliseconds
            date = new Date(rawTimestamp * 1000).toISOString().split("T")[0];
          } else if (typeof rawTimestamp === "string") {
            // ISO string from D1 → parse directly
            date = new Date(rawTimestamp).toISOString().split("T")[0];
          }
        } catch {
          // If date parsing fails, leave as null
          date = null;
        }
      }

      return {
        slug: post.slug,
        title: post.title,
        status: post.status || "draft",
        date,
        tags: post.tags ? JSON.parse(post.tags) : [],
        description: post.description || "",
      };
    });

    return { posts, isExampleSite };
  } catch (error) {
    console.error("[Admin Blog] Error fetching posts:", error);
    return { posts: [] as BlogPost[], isExampleSite };
  }
};
