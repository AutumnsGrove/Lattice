import { json, error, type RequestHandler } from "@sveltejs/kit";

/**
 * POST /api/posts/[slug]/view - Record a view for a post
 *
 * Public endpoint - any visitor can trigger a view.
 * Rate limited to prevent abuse (one view per session per 5 minutes).
 *
 * Body: { sessionId?: string } - Optional session ID for deduplication
 */
export const POST: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
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
    const data = (await request.json()) as { sessionId?: string };

    const postMeta = platform.env.POST_META;
    const doId = postMeta.idFromName(`post:${locals.tenantId}:${slug}`);
    const stub = postMeta.get(doId);

    // Initialize DO if needed
    await stub.fetch("https://post.internal/meta/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: locals.tenantId, slug }),
    });

    // Record view
    const response = await stub.fetch("https://post.internal/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: data.sessionId }),
    });

    if (!response.ok) {
      throw error(response.status, await response.text());
    }

    const result = await response.json();
    return json(result);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Views API] Error recording view:", err);
    throw error(500, "Failed to record view");
  }
};

/**
 * GET /api/posts/[slug]/view - Get view count for a post
 *
 * Public endpoint - anyone can see view counts.
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
    const postMeta = platform.env.POST_META;
    const doId = postMeta.idFromName(`post:${locals.tenantId}:${slug}`);
    const stub = postMeta.get(doId);

    // Get meta (includes view count)
    const response = await stub.fetch("https://post.internal/meta");

    if (response.status === 404) {
      // Post meta not initialized yet - return 0 views
      return json({ viewCount: 0, isPopular: false });
    }

    if (!response.ok) {
      throw error(response.status, await response.text());
    }

    const meta = (await response.json()) as {
      viewCount: number;
      isPopular: boolean;
    };
    return json({ viewCount: meta.viewCount, isPopular: meta.isPopular });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Views API] Error getting views:", err);
    throw error(500, "Failed to get view count");
  }
};
