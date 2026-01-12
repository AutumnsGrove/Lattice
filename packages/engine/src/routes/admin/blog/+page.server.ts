import { getTenantDb } from "$lib/server/services/database";
import type { PageServerLoad } from "./$types";

interface PostRecord {
  slug: string;
  title: string;
  date?: string;
  /** JSON string of tags array */
  tags?: string;
  description?: string;
  /** Can be ISO string or Unix timestamp (number) */
  created_at?: string | number;
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
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

    // Fetch all posts for this tenant, ordered by publish date descending
    const postsArray = await tenantDb.queryMany<PostRecord>(
      "posts",
      undefined, // No additional WHERE clause (tenant_id is automatic)
      [],
      { orderBy: "published_at DESC, created_at DESC" },
    );

    // Transform posts - parse tags from JSON string
    const posts: BlogPost[] = postsArray.map((post) => {
      // Handle date - could be ISO string, Unix timestamp, or undefined
      let date = "";
      if (post.date) {
        date = post.date;
      } else if (post.created_at) {
        // created_at could be Unix timestamp (number) or ISO string
        if (typeof post.created_at === "number") {
          date = new Date(post.created_at * 1000).toISOString().split("T")[0];
        } else if (typeof post.created_at === "string") {
          date = post.created_at.split("T")[0];
        }
      }

      return {
        slug: post.slug,
        title: post.title,
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
