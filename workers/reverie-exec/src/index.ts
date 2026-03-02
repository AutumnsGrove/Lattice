/**
 * Reverie Exec Worker — Change Execution Service
 *
 * Accepts validated changes from the Reverie worker and applies them
 * by calling the SvelteKit app's existing REST endpoints via service binding.
 *
 * Routes:
 *   GET  /health   — Health check (no auth)
 *   POST /execute  — Apply validated changes (auth required)
 *
 * Authentication: X-API-Key header validated against EXEC_API_KEY secret
 */

import { Hono } from "hono";
import type { Env, ExecResponse } from "./types";
import { execAuth } from "./auth/middleware";
import { execRateLimit } from "./lib/rate-limit";
import { EXEC_ERRORS, buildExecError } from "./errors";
import { executeRoute } from "./routes/execute";

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// Security Headers
// =============================================================================

app.use("*", async (c, next) => {
	await next();
	c.header("X-Content-Type-Options", "nosniff");
	c.header("X-Frame-Options", "DENY");
	c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	c.header("Cache-Control", "no-store");
});

// =============================================================================
// Health Check (no auth)
// =============================================================================

app.get("/health", (c) => {
	const hasApp = !!c.env.GROVE_APP;
	const hasThreshold = !!c.env.THRESHOLD;

	return c.json({
		status: hasApp ? "healthy" : "degraded",
		version: "0.1.0",
		bindings: {
			groveApp: hasApp,
			threshold: hasThreshold,
		},
	});
});

// =============================================================================
// Authenticated Routes
// =============================================================================

// Content-Type enforcement on POST (reject non-JSON early)
app.use("/execute", async (c, next) => {
	if (c.req.method === "POST" && !c.req.header("content-type")?.includes("application/json")) {
		const { body, status } = buildExecError(EXEC_ERRORS.INVALID_CONTENT_TYPE);
		return c.json(body, status as 415);
	}
	return next();
});

app.use("/execute", execAuth);
app.use("/execute", execRateLimit());

app.route("/execute", executeRoute);

// =============================================================================
// Global Error Handler
// =============================================================================

app.onError((err, c) => {
	const errMsg = err instanceof Error ? err.message : "Unknown";
	console.error("[ReverieExec] Unhandled error:", { message: errMsg });
	const response: ExecResponse = {
		success: false,
		error: {
			code: "EXC-009",
			message: "An unexpected error occurred",
		},
	};
	return c.json(response, 500);
});

// =============================================================================
// 404
// =============================================================================

app.notFound((c) => {
	const response: ExecResponse = {
		success: false,
		error: {
			code: "EXC-011",
			message: "Route not found",
		},
	};
	return c.json(response, 404);
});

export default app;
