/**
 * Reverie Auth Middleware
 *
 * Verifies caller identity via REVERIE_API_KEY, then extracts tenant
 * context from X-Tenant-Id / X-Tier headers set by the engine proxy.
 *
 * Only the SvelteKit engine proxy should call this worker. The proxy
 * authenticates users via Heartwood, then forwards verified tenant
 * context through the service binding with the API key.
 */

import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "@autumnsgrove/lattice/utils";
import type { Env, ReverieVariables } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";

/**
 * Auth middleware for protected routes.
 *
 * 1. Verify X-API-Key matches REVERIE_API_KEY (caller auth)
 * 2. Extract X-Tenant-Id and X-Tier from headers (tenant context)
 * 3. Reject free tier (Reverie requires paid plan)
 */
export const reverieAuth = createMiddleware<{
	Bindings: Env;
	Variables: ReverieVariables;
}>(async (c, next) => {
	// Step 1: Verify caller API key
	const apiKey = c.req.header("X-API-Key");
	if (!apiKey) {
		const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
		return c.json(body, status as 401);
	}

	const expected = c.env.REVERIE_API_KEY;
	if (!expected) {
		console.error("[ReverieAuth] REVERIE_API_KEY secret not configured");
		const { body, status } = buildReverieError(REVERIE_ERRORS.INTERNAL_ERROR);
		return c.json(body, status as 500);
	}

	const valid = timingSafeEqual(apiKey, expected);
	if (!valid) {
		const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_INVALID);
		return c.json(body, status as 401);
	}

	// Step 2: Extract tenant context from headers
	const tenantId = c.req.header("X-Tenant-Id");
	if (!tenantId) {
		const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
		return c.json(body, status as 401);
	}

	const tier = c.req.header("X-Tier") as ReverieVariables["tier"] | undefined;
	const validTiers = new Set(["wanderer", "seedling", "sapling", "oak", "evergreen"]);
	const resolvedTier = tier && validTiers.has(tier) ? tier : "wanderer";

	// Step 3: Wanderer tier has no Reverie access
	if (resolvedTier === "wanderer") {
		const { body, status } = buildReverieError(REVERIE_ERRORS.TIER_FORBIDDEN);
		return c.json(body, status as 403);
	}

	c.set("tenantId", tenantId);
	c.set("tier", resolvedTier as ReverieVariables["tier"]);

	await next();
});
