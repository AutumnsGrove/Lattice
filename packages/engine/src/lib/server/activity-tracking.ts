/**
 * Activity Tracking
 *
 * Lightweight activity tracker for the inactivity reclamation system.
 * Updates `last_activity_at` on the tenants table for key user events.
 *
 * Designed to be non-blocking (fire-and-forget) so it never slows down
 * the primary request path. Failures are logged but never thrown.
 *
 * Events that count as activity:
 * - Post create/update
 * - Media upload
 * - Settings change
 * - Login success (handled separately by auth hooks)
 */

/**
 * Update the last_activity_at timestamp for a tenant.
 *
 * This is a fire-and-forget operation — it runs asynchronously and
 * never throws. Safe to call without awaiting.
 *
 * @param db - D1 database binding
 * @param tenantId - The tenant to update
 */
export function updateLastActivity(db: D1Database, tenantId: string): void {
  db.prepare(
    "UPDATE tenants SET last_activity_at = unixepoch() WHERE id = ?",
  )
    .bind(tenantId)
    .run()
    .catch((err) => {
      console.error("[Activity] Failed to update last_activity_at:", err);
    });
}
