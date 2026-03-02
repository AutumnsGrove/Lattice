/**
 * GET /history — Recent Reverie Interactions
 *
 * Returns the tenant's recent Reverie interaction history.
 * Reads from the reverie_interactions table in the engine DB.
 *
 * Note: This is a stub until the migration is applied.
 */

import { Hono } from "hono";
import type { Env, ReverieVariables, ReverieResponse } from "../types";

const history = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

history.get("/", async (c) => {
	const tenantId = c.get("tenantId");

	// TODO: Query reverie_interactions table once migration is applied
	// const results = await c.env.DB.prepare(
	//   "SELECT * FROM reverie_interactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20"
	// ).bind(tenantId).all();

	const response: ReverieResponse = {
		success: true,
		data: {
			interactions: [],
			total: 0,
		},
		meta: {
			latencyMs: 0,
		},
	};

	return c.json(response);
});

export { history };
