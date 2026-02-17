/**
 * Bookmark API — Toggle bookmark state
 *
 * POST /api/feed/[id]/bookmark — Toggle bookmark (idempotent)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { toggleBookmark } from "$lib/server/bookmarks";
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

  if (!validateUUID(params.id)) {
    return json(
      {
        error: "GROVE-API-040",
        error_code: "INVALID_REQUEST_BODY",
        error_description: "Invalid post ID format.",
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
      key: "meadow/bookmark",
      limit: 120,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const bookmarked = await toggleBookmark(db, locals.user.id, params.id);
  return json({ success: true, bookmarked });
};
