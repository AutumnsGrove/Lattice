/**
 * Webhook & Export Cleanup Worker
 *
 * Scheduled worker that runs daily at 3:00 AM UTC via Cloudflare Cron Trigger.
 *
 * Cleans up:
 * 1. Expired webhook events (120-day retention)
 * 2. Expired zip exports (7-day retention) — deletes R2 objects and updates D1 status
 */

export interface Env {
  DB: D1Database;
  EXPORTS_BUCKET: R2Bucket;
}

/**
 * Maximum records to delete per batch.
 * D1 has limits on statement execution time, so we batch deletions.
 */
const BATCH_SIZE = 1000;

/**
 * Maximum batches per invocation.
 * Prevents runaway execution if there's a huge backlog.
 */
const MAX_BATCHES = 50;

/**
 * Maximum expired exports to clean per invocation.
 * Each requires an R2 delete, so keep this modest.
 */
const EXPORT_CLEANUP_LIMIT = 50;

/**
 * Clean up expired export zip files from R2 and mark as expired in D1.
 */
async function cleanupExpiredExports(env: Env): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  try {
    // Find completed exports that have expired
    const expired = await env.DB.prepare(
      `SELECT id, r2_key FROM storage_exports
       WHERE status = 'complete' AND expires_at IS NOT NULL AND expires_at < ?
       LIMIT ?`,
    )
      .bind(now, EXPORT_CLEANUP_LIMIT)
      .all<{ id: string; r2_key: string | null }>();

    for (const exp of expired.results || []) {
      try {
        // Delete R2 object if it exists
        if (exp.r2_key) {
          await env.EXPORTS_BUCKET.delete(exp.r2_key);
        }

        // Mark as expired in D1
        await env.DB.prepare(
          "UPDATE storage_exports SET status = 'expired', r2_key = NULL WHERE id = ?",
        )
          .bind(exp.id)
          .run();

        cleaned++;
      } catch (err) {
        // Log individual failures but continue cleaning others
        console.error(
          `[Export Cleanup] Failed to clean export ${exp.id}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (cleaned > 0) {
      console.log(`[Export Cleanup] Cleaned ${cleaned} expired export(s)`);
    } else {
      console.log("[Export Cleanup] No expired exports to clean up");
    }
  } catch (err) {
    console.error(
      "[Export Cleanup] Failed to query expired exports:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return cleaned;
}

export default {
  /**
   * Cron trigger handler - called by Cloudflare Cron
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    let totalDeleted = 0;
    let batchCount = 0;

    // 1. Clean up expired webhooks
    try {
      while (batchCount < MAX_BATCHES) {
        const result = await env.DB.prepare(
          `DELETE FROM webhook_events
           WHERE id IN (
             SELECT id FROM webhook_events
             WHERE expires_at IS NOT NULL AND expires_at < ?
             LIMIT ?
           )`,
        )
          .bind(now, BATCH_SIZE)
          .run();

        const deletedInBatch = result.meta?.changes ?? 0;
        totalDeleted += deletedInBatch;
        batchCount++;

        if (deletedInBatch < BATCH_SIZE) {
          break;
        }
      }

      if (totalDeleted > 0) {
        console.log(
          `[Webhook Cleanup] Deleted ${totalDeleted} expired events in ${batchCount} batch(es)`,
        );
      } else {
        console.log("[Webhook Cleanup] No expired webhooks to clean up");
      }
    } catch (err) {
      console.error(
        "[Webhook Cleanup] Failed:",
        err instanceof Error ? err.message : String(err),
      );
      // Don't throw — continue to export cleanup
    }

    // 2. Clean up expired exports (R2 + D1)
    await cleanupExpiredExports(env);
  },

  /**
   * HTTP handler - for manual testing/debugging
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const now = Math.floor(Date.now() / 1000);
    let totalDeleted = 0;
    let batchCount = 0;

    try {
      while (batchCount < MAX_BATCHES) {
        const result = await env.DB.prepare(
          `DELETE FROM webhook_events
           WHERE id IN (
             SELECT id FROM webhook_events
             WHERE expires_at IS NOT NULL AND expires_at < ?
             LIMIT ?
           )`,
        )
          .bind(now, BATCH_SIZE)
          .run();

        const deletedInBatch = result.meta?.changes ?? 0;
        totalDeleted += deletedInBatch;
        batchCount++;

        if (deletedInBatch < BATCH_SIZE) {
          break;
        }
      }

      const exportsCleaned = await cleanupExpiredExports(env);

      return Response.json({
        success: true,
        webhooks: { deleted: totalDeleted, batches: batchCount },
        exports: { cleaned: exportsCleaned },
        message:
          totalDeleted > 0 || exportsCleaned > 0
            ? `Deleted ${totalDeleted} expired webhooks, cleaned ${exportsCleaned} expired exports`
            : "Nothing to clean up",
      });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
};
