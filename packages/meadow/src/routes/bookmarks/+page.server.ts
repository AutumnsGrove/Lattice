/**
 * Bookmarks Page — User's saved posts (auth required)
 */

import { redirect } from "@sveltejs/kit";
import { buildLoginUrl } from "@autumnsgrove/groveengine/grafts/login";
import type { PageServerLoad } from "./$types";
import { getFeed } from "$lib/server/feed";

export const load: PageServerLoad = async ({ url, platform, locals }) => {
  if (!locals.user) {
    redirect(302, buildLoginUrl(`${url.origin}/bookmarks`));
  }

  const db = platform?.env?.DB;
  if (!db) {
    return {
      feed: {
        posts: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      },
    };
  }

  const feed = await getFeed(db, {
    filter: "bookmarks",
    userId: locals.user.id,
    limit: 20,
    offset: 0,
  });

  return { feed };
};
