/**
 * Execution Worker Auth Middleware
 *
 * Validates the EXEC_API_KEY sent by the Reverie worker.
 * Extracts tenant ID and tier from request headers.
 *
 * Auth chain: Reverie → (EXEC_API_KEY) → Exec Worker
 * Only the Reverie worker should call this service.
 */

import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "@autumnsgrove/lattice/utils";
import type { Env, ExecVariables } from "../types";
import { EXEC_ERRORS, buildExecError } from "../errors";

/**
 * Auth middleware for the execution worker.
 * Validates X-API-Key against EXEC_API_KEY secret.
 */
export const execAuth = createMiddleware<{
	Bindings: Env;
	Variables: ExecVariables;
}>(async (c, next) => {
	const apiKey = c.req.header("X-API-Key");
	if (!apiKey) {
		const { body, status } = buildExecError(EXEC_ERRORS.AUTH_REQUIRED);
		return c.json(body, status as 401);
	}

	const expected = c.env.EXEC_API_KEY;
	if (!expected) {
		console.error("[ExecAuth] EXEC_API_KEY secret not configured");
		const { body, status } = buildExecError(EXEC_ERRORS.INTERNAL_ERROR);
		return c.json(body, status as 500);
	}

	const valid = timingSafeEqual(apiKey, expected);
	if (!valid) {
		const { body, status } = buildExecError(EXEC_ERRORS.AUTH_INVALID);
		return c.json(body, status as 401);
	}

	// Extract tenant context from headers (set by Reverie)
	const tenantId = c.req.header("X-Tenant-Id");
	if (!tenantId) {
		const { body, status } = buildExecError(
			EXEC_ERRORS.AUTH_REQUIRED,
			"Missing X-Tenant-Id header",
		);
		return c.json(body, status as 401);
	}

	const tier = c.req.header("X-Tier") ?? "seedling";

	c.set("tenantId", tenantId);
	c.set("tier", tier);

	await next();
});
