/**
 * Bookmark API — Toggle bookmark state
 *
 * POST /api/feed/[id]/bookmark — Toggle bookmark (idempotent)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { toggleBookmark } from "$lib/server/bookmarks";
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
      key: `meadow/bookmark:${locals.user.id}`,
      limit: 120,
      windowSeconds: 3600,
      failMode: "open",
    });
    if (denied) return denied;
  }

  const bookmarked = await toggleBookmark(db, locals.user.id, params.id);
  return json({ success: true, bookmarked });
};
