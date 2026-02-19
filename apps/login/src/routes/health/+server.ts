import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Health check response format
 * Standardized across all Grove services for clearing-monitor
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  /** Service identifier */
  service: string;
  /** Optional reason for non-healthy status */
  reason?: string;
  /** Individual check results */
  checks: {
    name: string;
    status: "pass" | "fail" | "skip";
    latency_ms?: number;
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

/**
 * GET /health - Login service health check endpoint
 *
 * Deep health check that verifies:
 * - UI responsiveness (implicit — if we respond, UI is up)
 * - Heartwood service binding connectivity
 *
 * Used by clearing-monitor for automated status monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async ({ platform }) => {
  const checks: HealthCheckResponse["checks"] = [];

  // Check 1: UI responsiveness (always passes if we get here)
  checks.push({
    name: "ui_responsive",
    status: "pass",
  });

  // Check 2: Heartwood connectivity via service binding
  const heartwoodCheck = await checkHeartwood(platform?.env?.AUTH);
  checks.push(heartwoodCheck);

  // Determine overall status
  const failedChecks = checks.filter((c) => c.status === "fail");
  let status: HealthCheckResponse["status"] = "healthy";
  let reason: string | undefined;

  if (failedChecks.length === checks.length) {
    status = "unhealthy";
    reason = "All checks failed";
  } else if (failedChecks.length > 0) {
    status = "degraded";
    reason = "Login UI operational but Heartwood backend unavailable";
  }

  const response: HealthCheckResponse = {
    status,
    service: "login.grove.place",
    ...(reason && { reason }),
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
 * Check Heartwood service binding connectivity
 */
async function checkHeartwood(
  authBinding: Fetcher | undefined,
): Promise<HealthCheckResponse["checks"][number]> {
  if (!authBinding) {
    return {
      name: "heartwood_connectivity",
      status: "fail",
      error: "AUTH service binding not configured",
    };
  }

  const start = Date.now();
  try {
    // Ping Heartwood health endpoint via service binding
    const response = await authBinding.fetch(
      "https://login.grove.place/health",
    );
    const latency = Date.now() - start;

    if (!response.ok) {
      return {
        name: "heartwood_connectivity",
        status: "fail",
        latency_ms: latency,
        error: `Heartwood returned HTTP ${response.status}`,
      };
    }

    // Verify JSON response (don't need to validate contents deeply)
    try {
      await response.json();
    } catch {
      return {
        name: "heartwood_connectivity",
        status: "fail",
        latency_ms: latency,
        error: "Heartwood returned invalid JSON",
      };
    }

    return {
      name: "heartwood_connectivity",
      status: "pass",
      latency_ms: latency,
    };
  } catch (err) {
    return {
      name: "heartwood_connectivity",
      status: "fail",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
