/**
 * Grove Loft — Ephemeral Dev Environments
 *
 * Provisions code-server + SSH environments on Fly.io
 * using the Firefly SDK. Managed via gw loft CLI.
 *
 * Routes:
 * - GET  /health          — Health check (public)
 * - POST /ignite          — Provision a new machine
 * - POST /fade/:id        — Terminate a machine
 * - GET  /status          — Active instance info
 * - GET  /sessions        — Recent session history
 * - POST /activity/:id    — Keep-alive / report activity
 * - GET  /config/ssh-key  — Get stored SSH key
 * - PUT  /config/ssh-key  — Store SSH public key
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import { healthRoute } from "./routes/health";
import { igniteRoute } from "./routes/ignite";
import { fadeRoute } from "./routes/fade";
import { statusRoute } from "./routes/status";
import { sessionsRoute } from "./routes/sessions";
import { activityRoute } from "./routes/activity";
import { configRoute } from "./routes/config";
import { handleIdleCheck } from "./scheduled/idle-check";
import { handleOrphanSweep } from "./scheduled/orphan-sweep";
import { initializeSchema } from "./lib/schema";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Health — no auth
app.get("/health", healthRoute);

// All other routes require auth
app.use("*", authMiddleware);

// Routes
app.route("/ignite", igniteRoute);
app.route("/fade", fadeRoute);
app.route("/status", statusRoute);
app.route("/sessions", sessionsRoute);
app.route("/activity", activityRoute);
app.route("/config", configRoute);

// 404 fallback
app.notFound((c) => {
	return c.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown route" } }, 404);
});

// Global error handler
app.onError((err, c) => {
	console.error("[Loft] Unhandled error:", err);
	return c.json(
		{
			success: false,
			error: { code: "INTERNAL_ERROR", message: "An internal error occurred" },
		},
		500,
	);
});

export default {
	fetch: app.fetch,

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		// Ensure schema exists
		await initializeSchema(env.DB);

		const cronPattern = controller.cron;

		if (cronPattern === "*/2 * * * *") {
			// Every 2 minutes: idle check
			await handleIdleCheck(env, ctx);
		} else if (cronPattern === "0 */6 * * *") {
			// Every 6 hours: orphan sweep
			await handleOrphanSweep(env, ctx);
		}
	},
};
