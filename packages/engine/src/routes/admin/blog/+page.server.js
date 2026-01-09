import { getTenantDb } from "$lib/server/services/database";

/**
 * @typedef {Object} PostRecord
 * @property {string} slug
 * @property {string} title
 * @property {string} [date]
 * @property {string} [tags] - JSON string of tags array
 * @property {string} [description]
 * @property {string} [created_at]
 */

/**
 * Fetch posts from D1 database (multi-tenant)
 * @type {import('./$types').PageServerLoad}
 */
export async function load({ platform, locals }) {
  // Require tenant context
  if (!locals.tenantId) {
    console.error("[Admin Blog] No tenant ID found");
    return { posts: [] };
  }

  // Require database
  if (!platform?.env?.DB) {
    console.error("[Admin Blog] D1 database not available");
    return { posts: [] };
  }

  try {
    // Use TenantDb for automatic tenant scoping
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Fetch all posts for this tenant, ordered by date descending
    const postsArray = await tenantDb.queryMany(
      "posts",
      undefined, // No additional WHERE clause (tenant_id is automatic)
      [],
      { orderBy: "created_at DESC" },
    );

    // Transform posts - parse tags from JSON string
    const posts = postsArray.map((/** @type {PostRecord} */ post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date || post.created_at?.split("T")[0] || "",
      tags: post.tags ? JSON.parse(post.tags) : [],
      description: post.description || "",
    }));

    return { posts };
  } catch (error) {
    console.error("[Admin Blog] Error fetching posts:", error);
    return { posts: [] };
  }
}
