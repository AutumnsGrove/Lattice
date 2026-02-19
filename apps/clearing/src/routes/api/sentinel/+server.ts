/**
 * Sentinel API - POST /api/sentinel
 *
 * Protected endpoint for Sentinel stress testing system to report results.
 * Updates component statuses and optionally creates incidents based on results.
 *
 * Authentication: Bearer token via SENTINEL_API_KEY secret
 */
import type { RequestHandler } from "./$types";
import type { ComponentStatus } from "$lib/types/status";

interface SentinelReport {
  runId: string;
  tenantId: string;
  status: "completed" | "failed";
  results: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    errorRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    throughputOpsPerSec: number;
  };
  /** Optional: specific component to update */
  componentSlug?: string;
  /** Optional: create incident if error rate exceeds threshold */
  createIncident?: boolean;
}

export const POST: RequestHandler = async ({ request, platform }) => {
  // Verify API key
  const authHeader = request.headers.get("Authorization");
  const apiKey = platform?.env?.SENTINEL_API_KEY;

  if (!apiKey) {
    console.warn("[api/sentinel] SENTINEL_API_KEY not configured");
    return Response.json({ error: "API not configured" }, { status: 503 });
  }

  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!platform?.env?.DB) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    const report = (await request.json()) as SentinelReport;
    const db = platform.env.DB;
    const now = new Date().toISOString();

    // Determine component status based on error rate
    let newStatus: ComponentStatus = "operational";
    if (report.results.errorRate > 0.5) {
      newStatus = "major_outage";
    } else if (report.results.errorRate > 0.2) {
      newStatus = "partial_outage";
    } else if (report.results.errorRate > 0.05) {
      newStatus = "degraded";
    }

    // Update specific component or all infrastructure components
    if (report.componentSlug) {
      await db
        .prepare(
          "UPDATE status_components SET current_status = ?, updated_at = ? WHERE slug = ?",
        )
        .bind(newStatus, now, report.componentSlug)
        .run();
    } else {
      // Update infrastructure-related components based on Sentinel results
      // These are the components that Sentinel tests affect
      const infraComponents = ["blog-engine", "cdn", "api"];
      for (const slug of infraComponents) {
        await db
          .prepare(
            "UPDATE status_components SET current_status = ?, updated_at = ? WHERE slug = ?",
          )
          .bind(newStatus, now, slug)
          .run();
      }
    }

    // Create incident if requested and error rate warrants it
    // Threshold matches component degradation threshold (0.05) for consistency
    if (report.createIncident && report.results.errorRate > 0.05) {
      const incidentId = crypto.randomUUID();
      const slug = `sentinel-${report.runId.slice(0, 8)}-${Date.now()}`;

      const impact =
        report.results.errorRate > 0.5
          ? "critical"
          : report.results.errorRate > 0.2
            ? "major"
            : "minor";

      const incidentType =
        report.results.errorRate > 0.5 ? "outage" : "degraded";

      await db
        .prepare(
          `
					INSERT INTO status_incidents (id, title, slug, status, impact, type, started_at, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
        )
        .bind(
          incidentId,
          `Infrastructure Validation Alert (${(report.results.errorRate * 100).toFixed(1)}% error rate)`,
          slug,
          "investigating",
          impact,
          incidentType,
          now,
          now,
          now,
        )
        .run();

      // Add initial update
      await db
        .prepare(
          `
					INSERT INTO status_updates (id, incident_id, status, message, created_at)
					VALUES (?, ?, ?, ?, ?)
				`,
        )
        .bind(
          crypto.randomUUID(),
          incidentId,
          "investigating",
          `Sentinel stress test (run ${report.runId}) detected elevated error rate of ${(report.results.errorRate * 100).toFixed(1)}%. Average latency: ${report.results.avgLatencyMs.toFixed(0)}ms, P95: ${report.results.p95LatencyMs.toFixed(0)}ms. Investigating potential infrastructure issues.`,
          now,
        )
        .run();

      return Response.json({
        success: true,
        statusUpdated: newStatus,
        incidentCreated: true,
        incidentId,
        incidentSlug: slug,
      });
    }

    return Response.json({
      success: true,
      statusUpdated: newStatus,
      incidentCreated: false,
    });
  } catch (error) {
    console.error("[api/sentinel] Error processing report:", error);
    return Response.json(
      {
        error: "Failed to process report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

// Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
};
