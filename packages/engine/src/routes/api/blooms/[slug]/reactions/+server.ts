import { json, error, type RequestHandler } from "@sveltejs/kit";
import { API_ERRORS, throwGroveError } from "$lib/errors";

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
    throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
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
    throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
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
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
  if (!platform?.env?.POST_META) {
    throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    const data = (await request.json()) as { type: "like" | "bookmark" };

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
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
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
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
  if (!platform?.env?.POST_META) {
    throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const { slug } = params;
  if (!slug) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    const data = (await request.json()) as { type: "like" | "bookmark" };

    if (!data.type || !["like", "bookmark"].includes(data.type)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
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
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
