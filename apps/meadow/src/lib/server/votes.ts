/**
 * Votes Service — Cast and remove upvotes
 *
 * Score is denormalized on meadow_posts for fast sorting.
 * After each vote change, we recount from meadow_votes.
 */

/**
 * Cast an upvote on a post. No-op if already voted.
 * Returns true if the vote was newly created.
 */
export async function castVote(
  db: D1Database,
  userId: string,
  postId: string,
): Promise<boolean> {
  const id = crypto.randomUUID();

  try {
    await db
      .prepare(
        `INSERT INTO meadow_votes (id, user_id, post_id)
         VALUES (?, ?, ?)`,
      )
      .bind(id, userId, postId)
      .run();

    await updatePostScore(db, postId);
    return true;
  } catch (err: unknown) {
    // UNIQUE constraint = already voted, not an error
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
 * Remove an upvote from a post.
 * Returns true if a vote was actually removed.
 */
export async function removeVote(
  db: D1Database,
  userId: string,
  postId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM meadow_votes WHERE user_id = ? AND post_id = ?`)
    .bind(userId, postId)
    .run();

  if (result.meta.changes > 0) {
    await updatePostScore(db, postId);
    return true;
  }
  return false;
}

/**
 * Recount votes and update the denormalized score on meadow_posts.
 */
async function updatePostScore(db: D1Database, postId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE meadow_posts
       SET score = (SELECT COUNT(*) FROM meadow_votes WHERE post_id = ?)
       WHERE id = ?`,
    )
    .bind(postId, postId)
    .run();
}
