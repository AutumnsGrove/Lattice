/**
 * Follow API — Follow or unfollow a blog
 *
 * POST   /api/follow/[tenantId] — Follow
 * DELETE /api/follow/[tenantId] — Unfollow
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { followBlog, unfollowBlog } from "$lib/server/follows";
import { createThreshold } from "@autumnsgrove/groveengine/threshold";
import { thresholdCheck } from "@autumnsgrove/groveengine/threshold/sveltekit";

export const POST: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    return json(
      {
        error: "GROVE-API-020",
        error_code: "UNAUTHORIZED",
        error_description: "Please sign in to continue.",
      },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  // Rate limit
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `meadow/follow:${locals.user.id}`,
      limit: 30,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const created = await followBlog(db, locals.user.id, params.tenantId);
  return json({ success: true, following: true, created });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    return json(
      {
        error: "GROVE-API-020",
        error_code: "UNAUTHORIZED",
        error_description: "Please sign in to continue.",
      },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  // Rate limit
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `meadow/follow:${locals.user.id}`,
      limit: 30,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const removed = await unfollowBlog(db, locals.user.id, params.tenantId);
  return json({ success: true, following: false, removed });
};
