/**
 * Grove Warden — External API Gateway
 *
 * Sits between agents and third-party APIs (GitHub, Tavily, etc.),
 * injecting credentials securely so agents never see raw API keys.
 *
 * Routes:
 * - GET  /health          — Health check
 * - POST /nonce           — Request auth nonce
 * - POST /request         — Proxied API request
 * - POST /resolve         — Credential resolution (service-binding only)
 * - POST /admin/agents    — Register agent
 * - GET  /admin/agents    — List agents
 * - DELETE /admin/agents/:id — Revoke agent
 * - GET  /admin/logs      — Query audit log
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { nonceRoute } from "./routes/nonce";
import { requestRoute } from "./routes/request";
import { resolveRoute } from "./routes/resolve";
import { adminRoutes } from "./routes/admin";

// Register services with the registry (side-effect imports)
import "./services";
import { listServices } from "./services";

const app = new Hono<{ Bindings: Env }>();

// CORS for cross-origin agent requests
app.use(
	"*",
	cors({
		origin: ["https://grove.place", "https://*.grove.place"],
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "X-API-Key", "Authorization"],
	}),
);

// Health endpoint — no auth required
app.get("/health", (c) => {
	return c.json({
		status: "healthy",
		services: listServices(),
		version: "0.2.0",
	});
});

// Auth nonce endpoint
app.route("/nonce", nonceRoute);

// Main request proxy
app.route("/request", requestRoute);

// Credential resolution (service-binding callers only)
app.route("/resolve", resolveRoute);

// Admin endpoints
app.route("/admin", adminRoutes);

// 404 fallback
app.notFound((c) => {
	return c.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown route" } }, 404);
});

// Global error handler
app.onError((err, c) => {
	console.error("[Warden] Unhandled error:", err);
	return c.json(
		{ success: false, error: { code: "INTERNAL_ERROR", message: "An internal error occurred" } },
		500,
	);
});

export default app;
