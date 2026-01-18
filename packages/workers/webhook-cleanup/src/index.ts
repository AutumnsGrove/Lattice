/**
 * Webhook Cleanup Worker
 *
 * Scheduled worker that deletes expired webhook events.
 * Runs daily at 3:00 AM UTC via Cloudflare Cron Trigger.
 *
 * Retention policy: 120 days (set by calculateWebhookExpiry in engine)
 */

export interface Env {
  DB: D1Database;
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

    try {
      // Batch delete expired webhooks
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

        // Exit if we deleted fewer than BATCH_SIZE (no more to delete)
        if (deletedInBatch < BATCH_SIZE) {
          break;
        }
      }

      // Log for monitoring (visible in Cloudflare dashboard)
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
      throw err; // Re-throw to mark the cron execution as failed
    }
  },

  /**
   * HTTP handler - for manual testing/debugging
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow GET for manual testing
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

      return Response.json({
        success: true,
        deleted: totalDeleted,
        batches: batchCount,
        message:
          totalDeleted > 0
            ? `Deleted ${totalDeleted} expired webhook events`
            : "No expired webhooks to clean up",
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
