/**
 * Custom Worker Entry Point
 *
 * Wraps SvelteKit's generated _worker.js with a scheduled() handler
 * for cron-triggered health monitoring. This is the file that wrangler
 * deploys — it delegates fetch() to SvelteKit and adds scheduled()
 * for the monitor cron triggers.
 *
 * Build pipeline:
 * 1. vite build        → .svelte-kit/cloudflare/_worker.js (SvelteKit)
 * 2. esbuild this file → .svelte-kit/cloudflare/_entry.js  (this + monitor code)
 * 3. wrangler deploy   → deploys _entry.js + _worker.js + static assets
 */

// @ts-expect-error — runtime import of SvelteKit build output (exists after vite build)
import svelteKitWorker from "./_worker.js";
import { COMPONENTS } from "./lib/server/monitor/config";
import { checkAllComponents } from "./lib/server/monitor/health-checks";
import { processAllResults } from "./lib/server/monitor/incident-manager";
import { recordDailyHistory, cleanupOldHistory } from "./lib/server/monitor/daily-history";

interface MonitorEnv {
	DB: D1Database;
	MONITOR_KV: KVNamespace;
	ZEPHYR_URL?: string;
	ZEPHYR_API_KEY?: string;
	ALERT_EMAIL?: string;
}

async function runHealthChecks(env: MonitorEnv): Promise<void> {
	console.log("[Clearing Monitor] Starting health checks...");
	const startTime = Date.now();

	try {
		const results = await checkAllComponents(COMPONENTS);
		const healthy = results.filter((r) => r.status === "operational").length;
		console.log(`[Clearing Monitor] Health check complete: ${healthy}/${results.length} healthy`);
		await processAllResults(env, results);
		console.log(`[Clearing Monitor] Completed in ${Date.now() - startTime}ms`);
	} catch (err) {
		console.error(
			"[Clearing Monitor] Health check failed:",
			err instanceof Error ? err.message : String(err),
		);
		throw err;
	}
}

async function runDailyAggregation(env: MonitorEnv): Promise<void> {
	console.log("[Clearing Monitor] Starting daily aggregation...");

	try {
		await recordDailyHistory(env);
		await cleanupOldHistory(env);
		console.log("[Clearing Monitor] Daily aggregation complete");
	} catch (err) {
		console.error(
			"[Clearing Monitor] Daily aggregation failed:",
			err instanceof Error ? err.message : String(err),
		);
		throw err;
	}
}

export default {
	fetch: svelteKitWorker.fetch,

	async scheduled(
		controller: ScheduledController,
		env: MonitorEnv,
		ctx: ExecutionContext,
	): Promise<void> {
		const isHealthCheck = controller.cron === "*/5 * * * *";
		const isDailyAggregation = controller.cron === "0 0 * * *";

		if (isHealthCheck) await runHealthChecks(env);
		if (isDailyAggregation) await runDailyAggregation(env);

		// Unknown cron pattern — run health checks as default (handles manual triggers)
		if (!isHealthCheck && !isDailyAggregation) await runHealthChecks(env);
	},
};
