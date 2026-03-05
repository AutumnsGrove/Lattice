/**
 * GET /history — Recent Reverie Interactions
 *
 * Returns the tenant's recent Reverie interaction history.
 * Reads from the reverie_interactions table in the engine DB.
 */

import { Hono } from "hono";
import type { Env, ReverieVariables, ReverieResponse } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";

const history = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

history.get("/", async (c) => {
	const startTime = Date.now();
	const tenantId = c.get("tenantId");

	try {
		const results = await c.env.DB.prepare(
			"SELECT id, input_text, action, domains_matched, atmosphere_used, lumen_model, success, created_at FROM reverie_interactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20",
		)
			.bind(tenantId)
			.all();

		const response: ReverieResponse = {
			success: true,
			data: {
				interactions: results.results ?? [],
				total: results.results?.length ?? 0,
			},
			meta: {
				latencyMs: Date.now() - startTime,
			},
		};

		return c.json(response);
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : "Unknown";
		console.error("[Reverie] History query error:", { message: errMsg });
		const { body, status } = buildReverieError(REVERIE_ERRORS.DB_ERROR);
		return c.json(body, status as 500);
	}
});

export { history };
