/**
 * Feed Service — Query Composition for 5 Feed Algorithms
 *
 * Each algorithm builds a different ORDER BY / WHERE clause
 * while sharing the same base SELECT with LEFT JOINs for user state.
 */

import type { FeedOptions, FeedPage, PostRow } from "./types";
import { rowToPost } from "./types";

/**
 * Base SELECT with optional LEFT JOINs for user vote/bookmark state.
 * When userId is null, the joined columns will always be NULL.
 */
function buildBaseSelect(userId: string | null): string {
  const userJoins = userId
    ? `
    LEFT JOIN meadow_votes mv ON mv.post_id = p.id AND mv.user_id = ?
    LEFT JOIN meadow_bookmarks mb ON mb.post_id = p.id AND mb.user_id = ?
    LEFT JOIN (
      SELECT post_id, json_group_array(emoji) AS emojis
      FROM meadow_reactions
      WHERE user_id = ?
      GROUP BY post_id
    ) mr ON mr.post_id = p.id`
    : ``;

  return `
    SELECT
      p.id, p.tenant_id, p.guid, p.title, p.description, p.content_html,
      p.link, p.author_name, p.author_subdomain, p.tags, p.featured_image,
      p.published_at, p.score, p.reaction_counts,
      p.post_type, p.user_id, p.body,
      ${userId ? "CASE WHEN mv.id IS NOT NULL THEN 1 ELSE 0 END" : "0"} AS user_voted,
      ${userId ? "CASE WHEN mb.id IS NOT NULL THEN 1 ELSE 0 END" : "0"} AS user_bookmarked,
      ${userId ? "mr.emojis" : "NULL"} AS user_reactions
    FROM meadow_posts p
    ${userJoins}`;
}

/** Bind params for the user joins (3 bindings: vote, bookmark, reactions) */
function userBindParams(userId: string | null): string[] {
  return userId ? [userId, userId, userId] : [];
}

/**
 * Get the period start timestamp for "top" filter.
 */
function getPeriodStart(period: string): number {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case "day":
      return now - 86400;
    case "week":
      return now - 604800;
    case "month":
      return now - 2592000;
    default:
      return now - 604800; // Default to week
  }
}

/**
 * Fetch a page of feed posts with the specified algorithm.
 */
export async function getFeed(
  db: D1Database,
  options: FeedOptions,
): Promise<FeedPage> {
  const { filter, topPeriod, userId = null, limit, offset } = options;

  const baseSelect = buildBaseSelect(userId);
  const baseBinds = userBindParams(userId);

  let whereClause = "WHERE p.visible = 1";
  let orderClause = "";
  const whereBinds: (string | number)[] = [];

  // Content type filters
  if (filter === "notes") {
    whereClause += " AND p.post_type = ?";
    whereBinds.push("note");
  } else if (filter === "blooms") {
    whereClause += " AND p.post_type = ?";
    whereBinds.push("bloom");
  }

  // Algorithm selection (notes/blooms use "all" ordering)
  const algo = filter === "notes" || filter === "blooms" ? "all" : filter;

  switch (algo) {
    case "all":
      orderClause = "ORDER BY p.published_at DESC";
      break;

    case "popular":
      orderClause = "ORDER BY p.score DESC, p.published_at DESC";
      break;

    case "hot": {
      // HN-style decay: score / (hours_since + 2)^1.5
      // SQLite doesn't have POWER, so: x^1.5 = x * sqrt(x)
      const now = Math.floor(Date.now() / 1000);
      orderClause = `ORDER BY
        CASE WHEN ((${now} - p.published_at) / 3600.0 + 2.0) > 0
          THEN p.score / (
            ((${now} - p.published_at) / 3600.0 + 2.0)
            * ((${now} - p.published_at) / 3600.0 + 2.0)
            * SQRT(ABS((${now} - p.published_at) / 3600.0 + 2.0))
          )
          ELSE 0
        END DESC, p.published_at DESC`;
      break;
    }

    case "top": {
      const periodStart = getPeriodStart(topPeriod || "week");
      whereClause += " AND p.published_at >= ?";
      whereBinds.push(periodStart);
      orderClause = "ORDER BY p.score DESC, p.published_at DESC";
      break;
    }

    case "following": {
      if (!userId) {
        return {
          posts: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        };
      }
      whereClause += ` AND p.tenant_id IN (
        SELECT followed_tenant_id FROM meadow_follows WHERE follower_id = ?
      )`;
      whereBinds.push(userId);
      orderClause = "ORDER BY p.published_at DESC";
      break;
    }

    case "bookmarks": {
      if (!userId) {
        return {
          posts: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        };
      }
      whereClause += ` AND p.id IN (
        SELECT post_id FROM meadow_bookmarks WHERE user_id = ?
      )`;
      whereBinds.push(userId);
      orderClause = "ORDER BY p.published_at DESC";
      break;
    }

    default:
      orderClause = "ORDER BY p.published_at DESC";
  }

  const allBinds = [...baseBinds, ...whereBinds];

  // Run count and data queries in parallel
  const [countResult, postsResult] = await Promise.all([
    db
      .prepare(`SELECT COUNT(*) as total FROM meadow_posts p ${whereClause}`)
      .bind(...whereBinds)
      .first<{ total: number }>()
      .catch(() => ({ total: 0 })),

    db
      .prepare(`${baseSelect} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`)
      .bind(...allBinds, limit, offset)
      .all<PostRow>()
      .catch(() => ({ results: [] as PostRow[] })),
  ]);

  const total = countResult?.total ?? 0;
  const posts = postsResult.results.map(rowToPost);

  return {
    posts,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + posts.length < total,
    },
  };
}
