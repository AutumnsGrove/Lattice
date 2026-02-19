/**
 * Status API - GET /api/status
 *
 * Public endpoint returning current platform status.
 * Used by engine's GlassStatusWidget and external integrations.
 *
 * Response is cached for 60 seconds to reduce D1 load.
 */
import type { RequestHandler } from "./$types";
import {
  getComponents,
  getActiveIncidents,
  getScheduledMaintenance,
} from "$lib/server/status";
import { calculateOverallStatus } from "$lib/types/status";

export const GET: RequestHandler = async ({ platform }) => {
  // Return mock data if DB not available
  if (!platform?.env?.DB) {
    return Response.json(
      {
        status: "operational",
        message: "All systems operational",
        components: [],
        activeIncidents: [],
        scheduledMaintenance: [],
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  try {
    // Parallel fetch for efficiency
    const [components, activeIncidents, scheduledMaintenance] =
      await Promise.all([
        getComponents(platform.env.DB),
        getActiveIncidents(platform.env.DB),
        getScheduledMaintenance(platform.env.DB),
      ]);

    const status = calculateOverallStatus(components);

    // Human-readable message
    const messageMap = {
      operational: "All systems operational",
      degraded: "Some systems experiencing degraded performance",
      partial_outage: "Partial system outage",
      major_outage: "Major system outage",
      maintenance: "Scheduled maintenance in progress",
    };

    return Response.json(
      {
        status,
        message: messageMap[status],
        components: components.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.current_status,
        })),
        activeIncidents: activeIncidents.map((i) => ({
          id: i.id,
          title: i.title,
          slug: i.slug,
          status: i.status,
          impact: i.impact,
          startedAt: i.started_at,
        })),
        scheduledMaintenance: scheduledMaintenance.map((m) => ({
          id: m.id,
          title: m.title,
          scheduledStart: m.scheduled_start,
          scheduledEnd: m.scheduled_end,
          status: m.status,
        })),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("[api/status] Error:", error);
    return Response.json(
      {
        status: "unknown",
        message: "Unable to fetch status",
        error: "Internal error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};

// Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
