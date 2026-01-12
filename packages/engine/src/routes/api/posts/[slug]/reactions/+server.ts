import { json, error, type RequestHandler } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";

/**
 * Helper to get PostMetaDO stub for a post
 */
function getPostMetaStub(
  platform: App.Platform,
  tenantId: string,
  slug: string,
): DurableObjectStub {
  const postMeta = platform.env.POST_META;
  if (!postMeta) {
    throw error(500, "Durable Objects not configured");
  }

  const doId = postMeta.idFromName(`post:${tenantId}:${slug}`);
  return postMeta.get(doId);
}

/**
 * GET /api/posts/[slug]/reactions - Get reaction counts for a post
 *
 * Public endpoint - anyone can view reaction counts.
 * Returns likes and bookmarks count.
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform?.env?.POST_META) {
    throw error(500, "Durable Objects not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    const stub = getPostMetaStub(platform, locals.tenantId, slug);

    // Initialize DO if needed (first access)
    await stub.fetch("https://post.internal/meta/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: locals.tenantId, slug }),
    });

    // Get reactions
    const response = await stub.fetch("https://post.internal/reactions");

    if (!response.ok) {
      throw error(response.status, await response.text());
    }

    const reactions = await response.json();
    return json(reactions);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Reactions API] Error getting reactions:", err);
    throw error(500, "Failed to get reactions");
  }
};

/**
 * POST /api/posts/[slug]/reactions - Add a reaction to a post
 *
 * Requires authentication for non-anonymous reactions.
 * Body: { type: "like" | "bookmark" }
 */
export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // CSRF check for state-changing operation
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POST_META) {
    throw error(500, "Durable Objects not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    const data = (await request.json()) as { type: "like" | "bookmark" };

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      throw error(400, "Invalid reaction type. Must be 'like' or 'bookmark'");
    }

    const stub = getPostMetaStub(platform, locals.tenantId, slug);

    // Initialize DO if needed
    await stub.fetch("https://post.internal/meta/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: locals.tenantId, slug }),
    });

    // Add reaction
    const response = await stub.fetch("https://post.internal/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: data.type,
        action: "add",
        userId: locals.user?.id || "anonymous",
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw error(response.status, text || "Failed to add reaction");
    }

    const result = await response.json();
    return json(result);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Reactions API] Error adding reaction:", err);
    throw error(500, "Failed to add reaction");
  }
};

/**
 * DELETE /api/posts/[slug]/reactions - Remove a reaction from a post
 *
 * Body: { type: "like" | "bookmark" }
 */
export const DELETE: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.POST_META) {
    throw error(500, "Durable Objects not configured");
  }

  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }

  const { slug } = params;
  if (!slug) {
    throw error(400, "Slug is required");
  }

  try {
    const data = (await request.json()) as { type: "like" | "bookmark" };

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      throw error(400, "Invalid reaction type. Must be 'like' or 'bookmark'");
    }

    const stub = getPostMetaStub(platform, locals.tenantId, slug);

    // Remove reaction
    const response = await stub.fetch("https://post.internal/reactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: data.type,
        action: "remove",
        userId: locals.user?.id || "anonymous",
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw error(response.status, text || "Failed to remove reaction");
    }

    const result = await response.json();
    return json(result);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Reactions API] Error removing reaction:", err);
    throw error(500, "Failed to remove reaction");
  }
};
