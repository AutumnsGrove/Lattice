/**
 * Post Detail — Load a single post with full content
 */

import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { PostRow } from "$lib/server/types";
import { rowToPost } from "$lib/server/types";

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(503, "Service unavailable");
  }

  const userId = locals.user?.id ?? null;

  const row = await db
    .prepare(
      `SELECT
        p.id, p.tenant_id, p.guid, p.title, p.description, p.content_html,
        p.link, p.author_name, p.author_subdomain, p.tags, p.featured_image,
        p.published_at, p.score, p.reaction_counts,
        p.post_type, p.user_id, p.body,
        ${userId ? "CASE WHEN mv.id IS NOT NULL THEN 1 ELSE 0 END" : "0"} AS user_voted,
        ${userId ? "CASE WHEN mb.id IS NOT NULL THEN 1 ELSE 0 END" : "0"} AS user_bookmarked,
        ${userId ? "mr.emojis" : "NULL"} AS user_reactions
      FROM meadow_posts p
      ${
        userId
          ? `
      LEFT JOIN meadow_votes mv ON mv.post_id = p.id AND mv.user_id = ?
      LEFT JOIN meadow_bookmarks mb ON mb.post_id = p.id AND mb.user_id = ?
      LEFT JOIN (
        SELECT post_id, json_group_array(emoji) AS emojis
        FROM meadow_reactions WHERE user_id = ?
        GROUP BY post_id
      ) mr ON mr.post_id = p.id`
          : ""
      }
      WHERE p.id = ? AND p.visible = 1`,
    )
    .bind(...(userId ? [userId, userId, userId, params.id] : [params.id]))
    .first<PostRow>();

  if (!row) {
    throw error(404, "Post not found");
  }

  return { post: rowToPost(row) };
};
