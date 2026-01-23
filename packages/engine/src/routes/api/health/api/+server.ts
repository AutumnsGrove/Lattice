import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * GET /api/health/api - Durable Objects health check
 *
 * Verifies that the grove-durable-objects worker is reachable
 * by making a lightweight fetch to a TenantDO stub.
 *
 * Used by the clearing-monitor instead of hitting the .workers.dev
 * URL directly (which fails for same-account worker-to-worker calls
 * on DO-backed workers).
 */
export const GET: RequestHandler = async ({ platform }) => {
  const checks: {
    name: string;
    status: "pass" | "fail";
    latency_ms?: number;
    error?: string;
  }[] = [];

  // Check TenantDO reachability via service binding
  const doCheck = await checkDurableObjects(platform?.env?.TENANTS);
  checks.push(doCheck);

  const failedChecks = checks.filter((c) => c.status === "fail");
  const status =
    failedChecks.length === checks.length
      ? "unhealthy"
      : failedChecks.length > 0
        ? "degraded"
        : "healthy";

  return json(
    {
      status,
      service: "grove-durable-objects",
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: status === "unhealthy" ? 503 : 200,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    },
  );
};

/**
 * Check Durable Objects reachability by fetching a stub.
 * Any HTTP response (even 404) proves the DO worker is alive.
 */
async function checkDurableObjects(
  tenants: DurableObjectNamespace | undefined,
): Promise<{
  name: string;
  status: "pass" | "fail";
  latency_ms?: number;
  error?: string;
}> {
  if (!tenants) {
    return {
      name: "durable_objects",
      status: "fail",
      error: "TENANTS namespace not configured",
    };
  }

  const start = Date.now();
  try {
    const id = tenants.idFromName("__health_check__");
    const stub = tenants.get(id);
    const res = await stub.fetch("http://do/config");
    // Any response means the DO worker is alive and responding
    // (even 404 for a non-existent tenant is fine)
    await res.text(); // consume body
    return {
      name: "durable_objects",
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "durable_objects",
      status: "fail",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown DO error",
    };
  }
}
