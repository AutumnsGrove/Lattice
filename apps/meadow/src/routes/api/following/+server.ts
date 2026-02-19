/**
 * Following API — User's followed blogs
 *
 * GET /api/following
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getFollowing } from "$lib/server/follows";

export const GET: RequestHandler = async ({ platform, locals }) => {
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

  const following = await getFollowing(db, locals.user.id);
  return json({ following });
};
