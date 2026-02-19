/**
 * Feed Page — Server-side data loading
 *
 * Loads initial feed page (20 posts, respects filter param).
 */

import type { PageServerLoad } from "./$types";
import { getFeed } from "$lib/server/feed";
import type { FeedFilter, TopPeriod } from "$lib/server/types";

const VALID_FILTERS = new Set([
  "all",
  "popular",
  "hot",
  "top",
  "following",
  "notes",
  "blooms",
]);

export const load: PageServerLoad = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return {
      feed: {
        posts: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      },
      filter: "all" as FeedFilter,
    };
  }

  const filterParam = url.searchParams.get("filter") || "all";
  const filter: FeedFilter = VALID_FILTERS.has(filterParam)
    ? (filterParam as FeedFilter)
    : "all";

  const topPeriod = (url.searchParams.get("topPeriod") || "week") as TopPeriod;

  const feed = await getFeed(db, {
    filter,
    topPeriod,
    userId: locals.user?.id ?? null,
    limit: 20,
    offset: 0,
  });

  return { feed, filter };
};
