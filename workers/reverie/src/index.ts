/**
 * Reverie Worker — AI-Powered Site Configuration
 *
 * Translates natural language into coordinated site configuration changes
 * across 32 domains using the Lumen inference pipeline.
 *
 * Routes:
 *   GET  /health       — Health check (no auth)
 *   GET  /domains      — List available domains (auth)
 *   GET  /atmospheres  — List atmosphere presets (auth)
 *   GET  /history      — Recent interactions (auth)
 *   POST /configure    — AI-powered configuration (auth)
 *   POST /execute      — Apply previewed changes (auth)
 *   POST /query        — Read-only domain query (auth)
 *
 * Authentication: X-Tenant-Id + X-Tier headers (dev stub)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { groveInfraMiddleware } from "@autumnsgrove/infra/cloudflare";
import type { MiddlewareHandler } from "hono";
import type { Env, AppVariables, ReverieResponse } from "./types";
import { reverieAuth } from "./auth/middleware";
import { reverieRateLimit } from "./lib/rate-limit";
import { configure } from "./routes/configure";
import { execute } from "./routes/execute";
import { query } from "./routes/query";
import { domains } from "./routes/domains";
import { atmospheres } from "./routes/atmospheres";
import { history } from "./routes/history";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Reject POST requests without application/json Content-Type */
const requireJson: MiddlewareHandler = async (c, next) => {
	if (c.req.method === "POST" && !c.req.header("content-type")?.includes("application/json")) {
		return c.json(
			{
				success: false,
				error: { code: "REV-004", message: "Content-Type must be application/json" },
			},
			415,
		);
	}
	return next();
};

// =============================================================================
// CORS — Allow Grove properties
// =============================================================================

app.use(
	"*",
	cors({
		origin: ["https://grove.place", "https://*.grove.place"],
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "X-Tenant-Id", "X-Tier"],
		credentials: false,
		maxAge: 600, // 10 minutes
	}),
);

// =============================================================================
// Infrastructure Context
// =============================================================================

app.use(
	"*",
	groveInfraMiddleware((env) => ({
		db: (env as unknown as Env).DB,
		env: env as Record<string, unknown>,
		dbName: "grove-reverie",
		observer: (event) => {
			console.log(
				`[Infra] ${event.service}.${event.operation} ` +
					`${event.ok ? "ok" : "ERR"} ${event.durationMs.toFixed(1)}ms` +
					`${event.detail ? ` — ${event.detail}` : ""}`,
			);
		},
	})) as MiddlewareHandler,
);

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
	const hasDB = !!c.env.DB;
	const hasCurioDB = !!c.env.CURIO_DB;
	const hasLumen = !!c.env.LUMEN;
	const hasAuth = !!c.env.AUTH;
	const hasRateLimits = !!c.env.RATE_LIMITS;

	return c.json({
		status: hasLumen ? "healthy" : "degraded",
		version: "0.1.0",
		capabilities: {
			configure: hasLumen,
			query: hasDB,
			atmospheres: true,
			domains: true,
		},
		bindings: {
			db: hasDB,
			curioDB: hasCurioDB,
			lumen: hasLumen,
			auth: hasAuth,
			rateLimits: hasRateLimits,
		},
	});
});

// =============================================================================
// Authenticated Routes
// =============================================================================

app.use("/configure/*", reverieAuth);
app.use("/execute/*", reverieAuth);
app.use("/query/*", reverieAuth);
app.use("/domains/*", reverieAuth);
app.use("/atmospheres/*", reverieAuth);
app.use("/history/*", reverieAuth);

// Content-Type enforcement on POST routes (reject non-JSON early)
app.use("/configure/*", requireJson);
app.use("/execute/*", requireJson);
app.use("/query/*", requireJson);

// Rate limiting (after auth, so tenantId is available for keying)
app.use("/configure/*", reverieRateLimit("reverie/configure"));
app.use("/execute/*", reverieRateLimit("reverie/execute"));
app.use("/query/*", reverieRateLimit("reverie/query"));

app.route("/configure", configure);
app.route("/execute", execute);
app.route("/query", query);
app.route("/domains", domains);
app.route("/atmospheres", atmospheres);
app.route("/history", history);

// =============================================================================
// Global Error Handler
// =============================================================================

app.onError((err, c) => {
	// Log error details server-side only — never expose to client
	const errMsg = err instanceof Error ? err.message : "Unknown";
	console.error("[Reverie] Unhandled error:", { message: errMsg });
	const response: ReverieResponse = {
		success: false,
		error: {
			code: "REV-014",
			message: "An unexpected error occurred",
		},
	};
	return c.json(response, 500);
});

// =============================================================================
// 404
// =============================================================================

app.notFound((c) => {
	const response: ReverieResponse = {
		success: false,
		error: {
			code: "REV-004",
			message: `Route not found: ${c.req.method} ${c.req.path}`,
		},
	};
	return c.json(response, 404);
});

export default app;
