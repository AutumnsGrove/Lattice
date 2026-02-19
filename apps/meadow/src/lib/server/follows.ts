/**
 * Follows Service — Follow and unfollow blog feeds
 *
 * Powers the "Following" filter tab in the feed.
 */

/**
 * Follow a blog's tenant feed.
 * Returns true if newly followed, false if already following.
 */
export async function followBlog(
  db: D1Database,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const id = crypto.randomUUID();

  try {
    await db
      .prepare(
        `INSERT INTO meadow_follows (id, follower_id, followed_tenant_id)
         VALUES (?, ?, ?)`,
      )
      .bind(id, userId, tenantId)
      .run();
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
 * Unfollow a blog's tenant feed.
 * Returns true if actually unfollowed, false if wasn't following.
 */
export async function unfollowBlog(
  db: D1Database,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM meadow_follows
       WHERE follower_id = ? AND followed_tenant_id = ?`,
    )
    .bind(userId, tenantId)
    .run();

  return result.meta.changes > 0;
}

/**
 * Get list of tenant IDs the user follows.
 */
export async function getFollowing(
  db: D1Database,
  userId: string,
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT followed_tenant_id
       FROM meadow_follows
       WHERE follower_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<{ followed_tenant_id: string }>();

  return result.results.map((r) => r.followed_tenant_id);
}
