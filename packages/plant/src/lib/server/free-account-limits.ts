/**
 * Free Account Creation Limits
 *
 * IP-based rate limiting for free (Wanderer) account creation.
 * Prevents abuse by limiting to 3 free accounts per IP address per 30 days.
 *
 * Uses the `free_account_creation_log` table from migration 053.
 */

/** Maximum free accounts allowed per IP within the rolling window */
const MAX_FREE_ACCOUNTS_PER_IP = 3;

/** Rolling window in seconds (30 days) */
const WINDOW_SECONDS = 30 * 24 * 60 * 60;

/**
 * Check if an IP address is allowed to create another free account.
 *
 * @param db - D1 database binding
 * @param ipAddress - The client IP address
 * @returns true if allowed, false if limit reached
 */
export async function checkFreeAccountIPLimit(
  db: D1Database,
  ipAddress: string,
): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;

  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM free_account_creation_log
       WHERE ip_address = ? AND created_at > ?`,
    )
    .bind(ipAddress, cutoff)
    .first<{ count: number }>();

  return !result || result.count < MAX_FREE_ACCOUNTS_PER_IP;
}

/**
 * Log a free account creation for IP tracking.
 *
 * @param db - D1 database binding
 * @param ipAddress - The client IP address
 */
export async function logFreeAccountCreation(
  db: D1Database,
  ipAddress: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO free_account_creation_log (id, ip_address, created_at)
       VALUES (?, ?, unixepoch())`,
    )
    .bind(crypto.randomUUID(), ipAddress)
    .run();
}
