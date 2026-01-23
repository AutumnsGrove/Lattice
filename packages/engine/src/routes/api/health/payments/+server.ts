import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * Health check response format
 * Standardized across all Grove services for Sentinel monitoring
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  /** Service identifier */
  service: string;
  /** Reason for current status (optional) */
  reason?: string;
  /** Individual check results */
  checks: {
    name: string;
    status: "pass" | "fail" | "skip";
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

/**
 * GET /api/health/payments - Payment subsystem health check
 *
 * Returns maintenance status while payments are not yet live.
 * Once LemonSqueezy verification is complete, this will switch
 * to checking actual configuration and connectivity.
 *
 * HTTP 203 (Non-Authoritative) signals: "I'm reachable, but not
 * fully operational yet." The Clearing Monitor interprets this
 * as maintenance mode rather than an outage.
 *
 * Used by Clearing Monitor for automated monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async () => {
  const response: HealthCheckResponse = {
    status: "maintenance",
    service: "grove-payments",
    reason: "Payments are not yet live — awaiting LemonSqueezy verification",
    checks: [
      {
        name: "lemonsqueezy_verification",
        status: "skip",
        error: "Awaiting store verification",
      },
    ],
    timestamp: new Date().toISOString(),
  };

  // HTTP 203 = Non-Authoritative Information
  // It's 2xx (won't error), but not 200 (not a "proper" success)
  return json(response, {
    status: 203,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
