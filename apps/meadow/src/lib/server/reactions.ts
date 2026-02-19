/**
 * Reactions Service — Add and remove emoji reactions
 *
 * reaction_counts is denormalized as a JSON object on meadow_posts.
 * After each change, we rebuild from meadow_reactions.
 */

import { isValidReaction } from "$lib/constants/reactions";

/**
 * Add an emoji reaction to a post.
 * Returns true if the reaction was newly created, false if it already existed.
 * Throws if the emoji is invalid.
 */
export async function addReaction(
  db: D1Database,
  userId: string,
  postId: string,
  emoji: string,
): Promise<boolean> {
  if (!isValidReaction(emoji)) {
    throw new Error("Invalid reaction emoji");
  }

  const id = crypto.randomUUID();

  try {
    await db
      .prepare(
        `INSERT INTO meadow_reactions (id, user_id, post_id, emoji)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(id, userId, postId, emoji)
      .run();

    await updateReactionCounts(db, postId);
    return true;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return false;
    }
    throw err;
  }
}

/**
 * Remove an emoji reaction from a post.
 * Returns true if a reaction was actually removed.
 */
export async function removeReaction(
  db: D1Database,
  userId: string,
  postId: string,
  emoji: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM meadow_reactions
       WHERE user_id = ? AND post_id = ? AND emoji = ?`,
    )
    .bind(userId, postId, emoji)
    .run();

  if (result.meta.changes > 0) {
    await updateReactionCounts(db, postId);
    return true;
  }
  return false;
}

/**
 * Rebuild the denormalized reaction_counts JSON on meadow_posts.
 * Format: {"❤️": 5, "✨": 3, ...}
 */
async function updateReactionCounts(
  db: D1Database,
  postId: string,
): Promise<void> {
  const rows = await db
    .prepare(
      `SELECT emoji, COUNT(*) as count
       FROM meadow_reactions
       WHERE post_id = ?
       GROUP BY emoji`,
    )
    .bind(postId)
    .all<{ emoji: string; count: number }>();

  const counts: Record<string, number> = {};
  for (const row of rows.results) {
    counts[row.emoji] = row.count;
  }

  await db
    .prepare(`UPDATE meadow_posts SET reaction_counts = ? WHERE id = ?`)
    .bind(JSON.stringify(counts), postId)
    .run();
}
