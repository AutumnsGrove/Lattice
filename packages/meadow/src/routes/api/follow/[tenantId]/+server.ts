/**
 * Follow API — Follow or unfollow a blog
 *
 * POST   /api/follow/[tenantId] — Follow
 * DELETE /api/follow/[tenantId] — Unfollow
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { followBlog, unfollowBlog } from "$lib/server/follows";
import { validateUUID } from "@autumnsgrove/lattice/utils/validation";
import { createThreshold } from "@autumnsgrove/lattice/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";

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

  if (!validateUUID(params.tenantId)) {
    return json(
      {
        error: "GROVE-API-040",
        error_code: "INVALID_REQUEST_BODY",
        error_description: "Invalid tenant ID format.",
      },
      { status: 400 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  // Rate limit
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/follow",
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

  if (!validateUUID(params.tenantId)) {
    return json(
      {
        error: "GROVE-API-040",
        error_code: "INVALID_REQUEST_BODY",
        error_description: "Invalid tenant ID format.",
      },
      { status: 400 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  // Rate limit
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: "meadow/follow",
      limit: 30,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const removed = await unfollowBlog(db, locals.user.id, params.tenantId);
  return json({ success: true, following: false, removed });
};
