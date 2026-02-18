/**
 * Grove Vista Collector
 *
 * Observability metrics collection worker for the Vista dashboard.
 * Runs on a cron schedule to collect and store metrics from all Grove services.
 *
 * Cron schedules:
 * - Every 5 minutes: Full metrics collection (Workers, D1, R2, KV, health checks)
 * - Daily at midnight UTC: Cost aggregation + 90-day retention cleanup
 */

import { createObservabilityCollector } from "@autumnsgrove/lattice/server/observability";
import type { ObservabilityEnv } from "@autumnsgrove/lattice/server/observability";

export default {
	async scheduled(
		event: ScheduledEvent,
		env: ObservabilityEnv,
		ctx: ExecutionContext,
	): Promise<void> {
		const trigger = event.cron === "0 0 * * *" ? "daily" : "cron";
		console.log(`[Vista Collector] Scheduled run — trigger: ${trigger}, cron: ${event.cron}`);
		const collector = createObservabilityCollector(env);
		ctx.waitUntil(collector.runFullCollection(trigger as "cron" | "manual"));
	},

	async fetch(request: Request, env: ObservabilityEnv): Promise<Response> {
		// Health probe — unauthenticated, returns no sensitive data
		if (request.method !== "POST") {
			return new Response(JSON.stringify({ status: "ready" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Manual trigger requires Bearer token auth to prevent unauthorized collection runs
		const authHeader = request.headers.get("Authorization");
		const expectedToken = env.CF_OBSERVABILITY_TOKEN;
		if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		console.log("[Vista Collector] Manual collection triggered via HTTP");
		try {
			const collector = createObservabilityCollector(env);
			const result = await collector.runFullCollection("manual");
			return new Response(JSON.stringify(result), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (err) {
			console.error("[Vista Collector] Manual collection failed:", err);
			return new Response(JSON.stringify({ error: "An internal error occurred." }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	},
};
