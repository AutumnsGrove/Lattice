/**
 * Bookmarks Service — Toggle saved posts
 *
 * INSERT or DELETE pattern. Returns the new bookmark state.
 */

/**
 * Toggle a bookmark on a post.
 * Returns true if now bookmarked, false if unbookmarked.
 */
export async function toggleBookmark(
  db: D1Database,
  userId: string,
  postId: string,
): Promise<boolean> {
  // Try to delete first (unbookmark)
  const result = await db
    .prepare(`DELETE FROM meadow_bookmarks WHERE user_id = ? AND post_id = ?`)
    .bind(userId, postId)
    .run();

  if (result.meta.changes > 0) {
    return false; // Was bookmarked, now unbookmarked
  }

  // Didn't exist — create it
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO meadow_bookmarks (id, user_id, post_id)
       VALUES (?, ?, ?)`,
    )
    .bind(id, userId, postId)
    .run();

  return true; // Now bookmarked
}
