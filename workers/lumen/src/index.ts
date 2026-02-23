/**
 * Lumen Worker — AI Inference Gateway
 *
 * Exposes the full Lumen pipeline (PII scrub, quota, fallback, Songbird)
 * as a standalone Cloudflare Worker reachable by any other worker via
 * service binding or HTTPS.
 *
 * Routes:
 *   GET  /health     — Health check (no auth)
 *   POST /inference  — Main AI inference (generation, summary, chat, code, image)
 *   POST /embed      — Vector embeddings
 *   POST /moderate   — Content moderation
 *   POST /transcribe — Voice-to-text
 *
 * Authentication: X-API-Key header validated against env.LUMEN_API_KEY
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, LumenWorkerResponse } from "./types";
import { apiKeyAuth } from "./auth/middleware";
import { inference } from "./routes/inference";
import { embed } from "./routes/embed";
import { moderate } from "./routes/moderate";
import { transcribe } from "./routes/transcribe";

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// CORS — Allow Grove properties
// =============================================================================

app.use(
	"*",
	cors({
		origin: ["https://grove.place", /\.grove\.place$/],
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "X-API-Key"],
	}),
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
	const hasAI = !!c.env.AI;
	const hasDB = !!c.env.DB;
	const hasWarden = !!c.env.WARDEN;
	const hasApiKey = !!c.env.LUMEN_API_KEY;

	return c.json({
		status: hasApiKey ? "healthy" : "degraded",
		version: "0.1.0",
		capabilities: {
			inference: true,
			embedding: hasAI,
			moderation: true,
			transcription: hasAI,
		},
		bindings: {
			ai: hasAI,
			db: hasDB,
			warden: hasWarden,
		},
	});
});

// =============================================================================
// Authenticated Routes
// =============================================================================

app.use("/inference/*", apiKeyAuth);
app.use("/embed/*", apiKeyAuth);
app.use("/moderate/*", apiKeyAuth);
app.use("/transcribe/*", apiKeyAuth);

app.route("/inference", inference);
app.route("/embed", embed);
app.route("/moderate", moderate);
app.route("/transcribe", transcribe);

// =============================================================================
// Global Error Handler
// =============================================================================

app.onError((err, c) => {
	console.error("[Lumen] Unhandled error:", err);
	const response: LumenWorkerResponse = {
		success: false,
		error: {
			code: "INTERNAL_ERROR",
			message: err instanceof Error ? err.message : "An unexpected error occurred",
		},
	};
	return c.json(response, 500);
});

// =============================================================================
// 404
// =============================================================================

app.notFound((c) => {
	const response: LumenWorkerResponse = {
		success: false,
		error: {
			code: "INVALID_REQUEST",
			message: `Route not found: ${c.req.method} ${c.req.path}`,
		},
	};
	return c.json(response, 404);
});

export default app;
