/**
 * Feed API — Paginated feed with filter algorithms
 *
 * GET /api/feed?filter=all&limit=20&offset=0&topPeriod=week
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
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
const VALID_TOP_PERIODS = new Set(["day", "week", "month"]);

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const filterParam = url.searchParams.get("filter") || "all";
  const filter: FeedFilter = VALID_FILTERS.has(filterParam)
    ? (filterParam as FeedFilter)
    : "all";

  const topPeriodParam = url.searchParams.get("topPeriod") || "week";
  const topPeriod: TopPeriod = VALID_TOP_PERIODS.has(topPeriodParam)
    ? (topPeriodParam as TopPeriod)
    : "week";

  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20") || 20),
    50,
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0") || 0,
  );

  const result = await getFeed(db, {
    filter,
    topPeriod,
    userId: locals.user?.id ?? null,
    limit,
    offset,
  });

  return json(result, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
};
