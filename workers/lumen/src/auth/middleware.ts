/**
 * Authentication Middleware
 *
 * Validates callers via X-API-Key header.
 * Sets tenant context from request body when available.
 *
 * For now this is simpler than Warden's dual-auth — Lumen callers
 * authenticate with a shared API key. Per-agent auth can be added
 * later following Warden's challenge-response pattern.
 */

import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "@autumnsgrove/lattice/utils";
import type { Env, LumenWorkerResponse, AppVariables } from "../types";

export type AuthVariables = AppVariables & {
	/** Whether the caller authenticated successfully */
	authenticated: boolean;
};

/**
 * API key authentication middleware.
 * Compares X-API-Key header against env.LUMEN_API_KEY using
 * constant-time comparison to prevent timing attacks.
 */
export const apiKeyAuth = createMiddleware<{
	Bindings: Env;
	Variables: AuthVariables;
}>(async (c, next) => {
	const apiKey = c.req.header("X-API-Key");

	if (!apiKey) {
		const response: LumenWorkerResponse = {
			success: false,
			error: {
				code: "AUTH_REQUIRED",
				message: "Missing X-API-Key header",
			},
		};
		return c.json(response, 401);
	}

	// Constant-time comparison to prevent timing attacks
	const expected = c.env.LUMEN_API_KEY;
	if (!expected) {
		const response: LumenWorkerResponse = {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "LUMEN_API_KEY not configured",
			},
		};
		return c.json(response, 500);
	}

	if (!timingSafeEqual(apiKey, expected)) {
		const response: LumenWorkerResponse = {
			success: false,
			error: {
				code: "AUTH_REQUIRED",
				message: "Invalid API key",
			},
		};
		return c.json(response, 401);
	}

	c.set("authenticated", true);
	await next();
});
