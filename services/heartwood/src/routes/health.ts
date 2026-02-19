/**
 * Health Check Route
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { createDbSession } from "../db/session.js";

const health = new Hono<{ Bindings: Env }>();

/**
 * GET /health - Health check endpoint
 */
health.get("/", async (c) => {
  const db = createDbSession(c.env);
  const timestamp = new Date().toISOString();

  // Optionally check database connectivity
  let dbStatus = "unknown";
  try {
    await db.prepare("SELECT 1").first();
    dbStatus = "healthy";
  } catch {
    dbStatus = "unhealthy";
  }

  return c.json({
    status: dbStatus === "healthy" ? "healthy" : "degraded",
    timestamp,
    components: {
      database: dbStatus,
    },
  });
});

/**
 * GET /health/replication - D1 read replication status
 * Returns info about which region served the request
 */
health.get("/replication", async (c) => {
  const db = createDbSession(c.env);
  const timestamp = new Date().toISOString();

  try {
    // Run a simple query to get replication metadata
    const result = await db.prepare("SELECT 1 as test").run();

    return c.json({
      status: "healthy",
      timestamp,
      replication: {
        served_by_region: result.meta?.served_by_region ?? "unknown",
        served_by_primary: result.meta?.served_by_primary ?? null,
        rows_read: result.meta?.rows_read ?? 0,
        rows_written: result.meta?.rows_written ?? 0,
        duration_ms: result.meta?.duration ?? 0,
        session_bookmark: db.getBookmark() ?? null,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        timestamp,
        error: "Failed to query database",
      },
      500,
    );
  }
});

export default health;
