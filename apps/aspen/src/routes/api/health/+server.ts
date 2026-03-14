import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * Health check response format
 * Standardized across all Grove services for Sentinel monitoring
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Service identifier */
  service: string;
  /** Individual check results */
  checks: {
    name: string;
    status: "pass" | "fail";
    latency_ms?: number;
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

/**
 * GET /api/health - Engine health check endpoint
 *
 * Deep health check that verifies:
 * - D1 database connectivity (query execution)
 * - KV namespace connectivity (simple get)
 *
 * Used by Sentinel for automated monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async ({ platform }) => {
  const startTime = Date.now();

  // Run health checks in parallel (independent operations, reduces total latency)
  const checks = await Promise.all([
    checkD1(platform?.env?.DB),
    checkKV(platform?.env?.CACHE_KV),
  ]);

  // Determine overall status
  const failedChecks = checks.filter((c) => c.status === "fail");
  let status: HealthCheckResponse["status"] = "healthy";

  if (failedChecks.length === checks.length) {
    status = "unhealthy";
  } else if (failedChecks.length > 0) {
    status = "degraded";
  }

  const response: HealthCheckResponse = {
    status,
    service: "grove-engine",
    checks,
    timestamp: new Date().toISOString(),
  };

  // Return appropriate HTTP status based on health
  const httpStatus =
    status === "unhealthy" ? 503 : status === "degraded" ? 200 : 200;

  return json(response, {
    status: httpStatus,
    headers: {
      // No caching - always fresh health data
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};

/**
 * Check D1 database connectivity with a simple query
 */
async function checkD1(
  db: D1Database | undefined,
): Promise<HealthCheckResponse["checks"][number]> {
  if (!db) {
    return {
      name: "d1_database",
      status: "fail",
      error: "D1 database not configured",
    };
  }

  const start = Date.now();
  try {
    // Simple query to verify D1 is responsive
    await db.prepare("SELECT 1 as ping").first();
    return {
      name: "d1_database",
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "d1_database",
      status: "fail",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown D1 error",
    };
  }
}

/**
 * Check KV namespace connectivity with a simple get
 */
async function checkKV(
  kv: KVNamespace | undefined,
): Promise<HealthCheckResponse["checks"][number]> {
  if (!kv) {
    return {
      name: "kv_cache",
      status: "fail",
      error: "KV namespace not configured",
    };
  }

  const start = Date.now();
  try {
    // Attempt to get a non-existent key (will return null, not error)
    await kv.get("__health_check__");
    return {
      name: "kv_cache",
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "kv_cache",
      status: "fail",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown KV error",
    };
  }
}
