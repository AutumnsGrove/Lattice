/**
 * BillingHub API - Main Entry Point
 *
 * Centralized payment service for AutumnsGrove properties.
 * Internal worker — accessed via service binding only.
 *
 * All Stripe business logic flows through this worker:
 *   - Checkout session creation
 *   - Billing portal sessions
 *   - Subscription management (cancel/resume)
 *   - Webhook processing
 *   - Billing status queries
 */

import { Hono } from "hono";
import type { Env } from "./types.js";

// Middleware
import { securityHeaders } from "./middleware/security.js";

// Routes
import checkout from "./routes/checkout.js";
import portal from "./routes/portal.js";
import cancel from "./routes/cancel.js";
import resume from "./routes/resume.js";
import status from "./routes/status.js";
import webhook from "./routes/webhook.js";
import health from "./routes/health.js";

// =============================================================================
// APP
// =============================================================================

const app = new Hono<{ Bindings: Env }>();

// Global middleware: security headers on all responses
app.use("*", securityHeaders);

// Mount routes
app.route("/checkout", checkout);
app.route("/portal", portal);
app.route("/cancel", cancel);
app.route("/resume", resume);
app.route("/status", status);
app.route("/webhook", webhook);
app.route("/health", health);

// Root — minimal response (no service info enumeration)
app.get("/", (c) => {
	return c.json({ service: "GroveBilling", status: "ok" });
});

// 404 handler
app.notFound((c) => {
	return c.json({ error: "not_found", message: "Endpoint not found" }, 404);
});

// Error handler — log safely (never log full error objects which may contain secrets)
app.onError((err, c) => {
	console.error("[BillingAPI] Unhandled error:", {
		message: err instanceof Error ? err.message : "Unknown error",
		name: err instanceof Error ? err.name : undefined,
	});
	return c.json({ error: "server_error", message: "An unexpected error occurred" }, 500);
});

// =============================================================================
// EXPORT
// =============================================================================

export default {
	fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),

	scheduled: async (controller: ScheduledController, env: Env, _ctx: ExecutionContext) => {
		// Daily webhook cleanup at 2 AM UTC
		if (controller.cron === "0 2 * * *") {
			try {
				const now = Math.floor(Date.now() / 1000);

				// Delete expired webhook events (120-day retention)
				const result = await env.DB.prepare(
					`DELETE FROM webhook_events WHERE expires_at IS NOT NULL AND expires_at < ?`,
				)
					.bind(now)
					.run();

				const deleted = result.meta?.changes ?? 0;
				if (deleted > 0) {
					console.log(`[Maintenance] Cleaned up ${deleted} expired webhook events`);
				}

				// Alert on unusually high deletion counts
				if (deleted > 5000) {
					console.warn(`[Maintenance] High webhook cleanup count: ${deleted} events`);
				}
			} catch (error) {
				console.error("[Maintenance] Webhook cleanup failed:", error);
			}
		} else {
			console.warn("[Cron] Unknown cron pattern:", controller.cron);
		}
	},
};
