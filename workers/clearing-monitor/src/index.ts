/**
 * Grove Clearing Monitor
 *
 * Automated health monitoring worker for The Clearing status page.
 *
 * Cron schedules:
 * - Every 5 minutes: Health checks for all components
 * - Daily at midnight UTC: Record daily history for uptime visualization
 *
 * Features:
 * - Deep health checks (JSON response parsing) for services with /api/health
 * - Shallow checks (HTTP status) for static resources
 * - Consecutive failure tracking to prevent false positives
 * - Automatic incident creation and resolution
 * - Email notifications via Resend
 * - 90-day uptime history
 */

import { COMPONENTS } from "./config";
import { checkAllComponents, type HealthCheckResult } from "./health-checks";
import { processAllResults, type IncidentEnv } from "./incident-manager";
import { recordDailyHistory, cleanupOldHistory } from "./daily-history";

export interface Env {
  /** D1 database (grove-engine-db) */
  DB: D1Database;
  /** KV namespace for tracking consecutive failures */
  MONITOR_KV: KVNamespace;
  /** Resend API key for email notifications */
  RESEND_API_KEY?: string;
  /** Email address for alert notifications */
  ALERT_EMAIL?: string;
}

export default {
  /**
   * Cron trigger handler - called by Cloudflare Cron
   *
   * Schedules:
   * - Every 5 minutes: Run health checks (cron: star-slash-5)
   * - Daily at midnight UTC: Record daily history (cron: 0 0 star star star)
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cronTime = new Date(controller.scheduledTime);
    const isHealthCheck = controller.cron === "*/5 * * * *";
    const isDailyAggregation = controller.cron === "0 0 * * *";

    if (isHealthCheck) {
      await runHealthChecks(env);
    }

    if (isDailyAggregation) {
      await runDailyAggregation(env);
    }

    // If cron pattern isn't recognized, run health checks by default
    // (handles manual triggers and testing)
    if (!isHealthCheck && !isDailyAggregation) {
      await runHealthChecks(env);
    }
  },

  /**
   * HTTP handler - for manual testing and status overview
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET / - Run health checks and return results (for testing)
    if (request.method === "GET" && url.pathname === "/") {
      try {
        const results = await checkAllComponents(COMPONENTS);
        await processAllResults(env, results);

        return Response.json({
          success: true,
          timestamp: new Date().toISOString(),
          results: results.map((r) => ({
            component: r.componentName,
            status: r.status,
            latencyMs: r.latencyMs,
            error: r.error,
          })),
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
    }

    // POST /daily - Manually trigger daily aggregation
    if (request.method === "POST" && url.pathname === "/daily") {
      try {
        await runDailyAggregation(env);
        return Response.json({
          success: true,
          message: "Daily aggregation completed",
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
    }

    return new Response("Grove Clearing Monitor", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};

/**
 * Run health checks for all components
 */
async function runHealthChecks(env: Env): Promise<void> {
  console.log("[Clearing Monitor] Starting health checks...");
  const startTime = Date.now();

  try {
    // Check all components in parallel
    const results = await checkAllComponents(COMPONENTS);

    // Log summary
    const healthy = results.filter((r) => r.status === "operational").length;
    const unhealthy = results.length - healthy;
    console.log(
      `[Clearing Monitor] Health check complete: ${healthy}/${results.length} healthy`,
    );

    // Process results (update D1, manage incidents)
    await processAllResults(env, results);

    const duration = Date.now() - startTime;
    console.log(`[Clearing Monitor] Completed in ${duration}ms`);
  } catch (err) {
    console.error(
      "[Clearing Monitor] Health check failed:",
      err instanceof Error ? err.message : String(err),
    );
    throw err; // Re-throw to mark cron execution as failed
  }
}

/**
 * Run daily aggregation for uptime history
 */
async function runDailyAggregation(env: Env): Promise<void> {
  console.log("[Clearing Monitor] Starting daily aggregation...");

  try {
    await recordDailyHistory(env);
    await cleanupOldHistory(env);
    console.log("[Clearing Monitor] Daily aggregation complete");
  } catch (err) {
    console.error(
      "[Clearing Monitor] Daily aggregation failed:",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
}
