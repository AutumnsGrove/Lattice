/**
 * Reverie Auth Middleware
 *
 * During development: stub that extracts tenant info from request headers.
 * Production: will verify Heartwood tokens via AUTH service binding.
 *
 * Sets tenantId and tier on Hono context variables.
 */

import { createMiddleware } from "hono/factory";
import type { Env, ReverieVariables } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";

/**
 * Auth middleware for protected routes.
 *
 * Current implementation: reads X-Tenant-Id and X-Tier headers.
 * This is a dev stub — production will verify Heartwood JWT tokens
 * via the AUTH service binding and extract tenant/tier from claims.
 */
export const reverieAuth = createMiddleware<{
	Bindings: Env;
	Variables: ReverieVariables;
}>(async (c, next) => {
	// Dev stub: accept tenant info from headers
	const tenantId = c.req.header("X-Tenant-Id");
	const tier = c.req.header("X-Tier") as ReverieVariables["tier"] | undefined;

	if (!tenantId) {
		const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
		return c.json(body, status as 401);
	}

	// Validate tier is a known value, default to "free"
	const validTiers = new Set(["free", "seedling", "sapling", "oak", "evergreen"]);
	const resolvedTier = tier && validTiers.has(tier) ? tier : "free";

	// Free tier has no Reverie access
	if (resolvedTier === "free") {
		const { body, status } = buildReverieError(REVERIE_ERRORS.TIER_FORBIDDEN);
		return c.json(body, status as 403);
	}

	c.set("tenantId", tenantId);
	c.set("tier", resolvedTier as ReverieVariables["tier"]);

	await next();
});
