/**
 * Bookmarks API — User's saved posts
 *
 * GET /api/bookmarks?limit=20&offset=0
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { PostRow } from "$lib/server/types";
import { rowToPost } from "$lib/server/types";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
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

  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20") || 20),
    50,
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0") || 0,
  );

  const userId = locals.user.id;

  const [countResult, postsResult] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as total
         FROM meadow_bookmarks bm
         JOIN meadow_posts p ON p.id = bm.post_id
         WHERE bm.user_id = ? AND p.visible = 1`,
      )
      .bind(userId)
      .first<{ total: number }>()
      .catch(() => ({ total: 0 })),

    db
      .prepare(
        `SELECT
          p.id, p.tenant_id, p.guid, p.title, p.description, p.content_html,
          p.link, p.author_name, p.author_subdomain, p.tags, p.featured_image,
          p.published_at, p.score, p.reaction_counts,
          CASE WHEN mv.id IS NOT NULL THEN 1 ELSE 0 END AS user_voted,
          1 AS user_bookmarked,
          mr.emojis AS user_reactions
        FROM meadow_bookmarks bm
        JOIN meadow_posts p ON p.id = bm.post_id
        LEFT JOIN meadow_votes mv ON mv.post_id = p.id AND mv.user_id = ?
        LEFT JOIN (
          SELECT post_id, json_group_array(emoji) AS emojis
          FROM meadow_reactions WHERE user_id = ?
          GROUP BY post_id
        ) mr ON mr.post_id = p.id
        WHERE bm.user_id = ? AND p.visible = 1
        ORDER BY bm.created_at DESC
        LIMIT ? OFFSET ?`,
      )
      .bind(userId, userId, userId, limit, offset)
      .all<PostRow>()
      .catch(() => ({ results: [] as PostRow[] })),
  ]);

  const total = countResult?.total ?? 0;
  const posts = postsResult.results.map(rowToPost);

  return json({
    posts,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + posts.length < total,
    },
  });
};
