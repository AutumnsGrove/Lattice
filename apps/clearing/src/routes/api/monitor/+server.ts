/**
 * GET /api/monitor — Manual health check trigger
 *
 * Runs health checks for all components and returns results as JSON.
 * Mirrors the old grove-clearing-monitor worker's GET / endpoint.
 * Useful for debugging and manual testing outside of cron triggers.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { COMPONENTS } from "$lib/server/monitor/config";
import { checkAllComponents } from "$lib/server/monitor/health-checks";
import { processAllResults } from "$lib/server/monitor/incident-manager";

export const GET: RequestHandler = async ({ platform }) => {
	const env = platform?.env;
	if (!env?.DB || !env?.MONITOR_KV) {
		return json({ success: false, error: "Missing required bindings" }, { status: 503 });
	}

	try {
		const results = await checkAllComponents(COMPONENTS, env);
		await processAllResults(env, results);

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			results: results.map((r) => ({
				component: r.componentName,
				status: r.status,
				latencyMs: r.latencyMs,
				error: r.error,
			})),
		});
	} catch (err) {
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
};
