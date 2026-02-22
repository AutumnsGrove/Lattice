/**
 * GroveBackups Worker - Main Entry Point
 *
 * Cloudflare Worker that handles:
 * - Scheduled cron jobs for automated backups
 * - HTTP endpoints for manual triggers and status
 */

import { Hono } from "hono";
import type { Env } from "./types";

// Middleware
import { requireApiKey } from "./middleware/auth";

// Route handlers
import { statusHandler } from "./routes/status";
import { listHandler } from "./routes/list";
import { triggerHandler } from "./routes/trigger";
import { downloadHandler } from "./routes/download";
import { restoreGuideHandler } from "./routes/restore-guide";
import { healthHandler } from "./routes/health";

// Scheduled handler
import { handleScheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

// ============================================
// Public Routes (no auth required)
// ============================================

// Root endpoint - documentation
app.get("/", (c) => {
	return c.json({
		name: "Patina",
		version: "1.0.0",
		description: "Automated D1 database backup system for Grove",
		schedule: {
			daily: "Priority databases at 3:00 AM UTC",
			weekly: "All databases on Sunday at 4:00 AM UTC",
		},
		retention: "12 weeks",
		databases: 14,
		dailyBackups: ["groveauth", "grove-engine-db", "grove-curios-db"],
		authentication: "Protected endpoints require: Authorization: Bearer <api-key>",
		endpoints: {
			public: {
				"GET /": "This documentation",
				"GET /health": "Health check for monitoring",
			},
			protected: {
				"GET /status": "Current backup status and recent history",
				"GET /list": "List all available backups (supports ?database=&date=&limit=&offset=)",
				"POST /trigger": "Manually trigger a full backup",
				"GET /download/:date/:db": "Download a specific backup file",
				"GET /restore-guide/:db": "Get restore instructions for a database",
			},
		},
	});
});

// Health check (public for monitoring)
app.get("/health", healthHandler);

// ============================================
// Protected Routes (require API key)
// ============================================

// Status endpoint
app.get("/status", requireApiKey, statusHandler);

// List backups
app.get("/list", requireApiKey, listHandler);

// Manual trigger
app.post("/trigger", requireApiKey, triggerHandler);

// Download backup
app.get("/download/:date/:db", requireApiKey, downloadHandler);

// Restore guide
app.get("/restore-guide/:db", requireApiKey, restoreGuideHandler);

// ============================================
// Worker Export
// ============================================

export default {
	/**
	 * Fetch handler - handles HTTP requests
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return app.fetch(request, env, ctx);
	},

	/**
	 * Scheduled handler - handles cron triggers
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(handleScheduled(event, env));
	},
};
