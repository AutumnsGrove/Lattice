/**
 * Health Check Route
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { createDbSession } from "../db/session.js";
import { timingSafeEqual } from "../utils/crypto.js";

const health = new Hono<{ Bindings: Env }>();

/**
 * GET /health - Health check endpoint
 *
 * Intentionally unauthenticated — polled by Clearing's uptime monitor
 * (config.ts: https://auth.grove.place/health) and e2e smoke tests.
 */
health.get("/", async (c) => {
	const db = createDbSession(c.env);
	const timestamp = new Date().toISOString();

	// Optionally check database connectivity
	let dbStatus = "unknown";
	try {
		await db.prepare("SELECT 1").first();
		dbStatus = "healthy";
	} catch (error) {
		dbStatus = "unhealthy";
		console.error("[Health] DB connectivity check failed:", error);
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
 *
 * Internal-service-only (SERVICE_SECRET), unlike the base /health route.
 * Unlike a plain up/down check, this leaks infra topology (which region
 * served the request, row counts, query duration, session bookmark) —
 * fine for an operator debugging replication lag, not something to hand
 * to an anonymous caller. Fails closed: a missing/empty SERVICE_SECRET
 * rejects every request rather than skipping the check, mirroring
 * session.ts's /validate-service and subscription.ts's internal routes.
 */
health.get("/replication", async (c) => {
	const provided = c.req.header("Authorization") || "";
	const expected = c.env.SERVICE_SECRET || "";
	if (!expected || !timingSafeEqual(provided, `Bearer ${expected}`)) {
		return c.json({ status: "error", error: "Unauthorized" }, 401);
	}

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
		console.error("[Health] Replication query failed:", error);
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
