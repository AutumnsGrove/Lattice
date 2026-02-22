/**
 * GET /health
 *
 * Health check endpoint for monitoring.
 * Returns status of worker, metadata DB, and R2 bucket.
 */

import type { Context } from "hono";
import type { Env, HealthResponse } from "../types";

const VERSION = "1.0.0";

export async function healthHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
	const checks = {
		worker: true,
		metadataDb: false,
		r2Bucket: false,
	};

	try {
		// Check metadata DB connectivity
		const dbCheck = await c.env.METADATA_DB.prepare("SELECT 1 as ok").first<{ ok: number }>();
		checks.metadataDb = dbCheck?.ok === 1;
	} catch (error) {
		console.error("Health check - DB error:", error);
		checks.metadataDb = false;
	}

	try {
		// Check R2 bucket accessibility by listing (limit 1)
		const r2Check = await c.env.BACKUPS.list({ limit: 1 });
		checks.r2Bucket = r2Check !== null;
	} catch (error) {
		console.error("Health check - R2 error:", error);
		checks.r2Bucket = false;
	}

	// Determine overall status
	const allHealthy = checks.worker && checks.metadataDb && checks.r2Bucket;
	const anyHealthy = checks.worker || checks.metadataDb || checks.r2Bucket;

	let status: "healthy" | "degraded" | "unhealthy";
	if (allHealthy) {
		status = "healthy";
	} else if (anyHealthy) {
		status = "degraded";
	} else {
		status = "unhealthy";
	}

	const response: HealthResponse = {
		status,
		timestamp: new Date().toISOString(),
		checks,
		version: VERSION,
	};

	// Return appropriate HTTP status code
	const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

	return c.json(response, httpStatus);
}
