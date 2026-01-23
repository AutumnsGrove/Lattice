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
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

/**
 * GET /api/health/payments - Payment subsystem health check
 *
 * Shallow health check that verifies:
 * - LemonSqueezy API key is configured
 * - LemonSqueezy store ID is configured
 * - LemonSqueezy webhook secret is configured
 *
 * Does NOT make external API calls to LemonSqueezy.
 * Used by Clearing Monitor for automated monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async ({ platform }) => {
  const checks: HealthCheckResponse["checks"] = [];

  // Check LemonSqueezy API key configuration
  const hasApiKey = !!platform?.env?.LEMON_SQUEEZY_API_KEY;
  checks.push({
    name: "lemonsqueezy_api_key",
    status: hasApiKey ? "pass" : "fail",
    ...(hasApiKey ? {} : { error: "LemonSqueezy API key not configured" }),
  });

  // Check LemonSqueezy store ID configuration
  const hasStoreId = !!platform?.env?.LEMON_SQUEEZY_STORE_ID;
  checks.push({
    name: "lemonsqueezy_store_id",
    status: hasStoreId ? "pass" : "fail",
    ...(hasStoreId ? {} : { error: "LemonSqueezy store ID not configured" }),
  });

  // Check LemonSqueezy webhook secret configuration
  const hasWebhookSecret = !!platform?.env?.LEMON_SQUEEZY_WEBHOOK_SECRET;
  checks.push({
    name: "lemonsqueezy_webhook_secret",
    status: hasWebhookSecret ? "pass" : "fail",
    ...(hasWebhookSecret
      ? {}
      : { error: "LemonSqueezy webhook secret not configured" }),
  });

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
    service: "grove-payments",
    checks,
    timestamp: new Date().toISOString(),
  };

  // Return appropriate HTTP status based on health
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return json(response, {
    status: httpStatus,
    headers: {
      // No caching - always fresh health data
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
