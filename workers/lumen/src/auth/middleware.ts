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
import type { Env, LumenWorkerResponse } from "../types";

/**
 * Constant-time string comparison to prevent timing attacks.
 * Pads both buffers to the same length so the comparison never
 * short-circuits on length mismatch (which would leak key length).
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const bufA = encoder.encode(a);
	const bufB = encoder.encode(b);

	// Pad to equal length so we never short-circuit on length difference
	const maxLen = Math.max(bufA.length, bufB.length);
	const paddedA = new Uint8Array(maxLen);
	const paddedB = new Uint8Array(maxLen);
	paddedA.set(bufA);
	paddedB.set(bufB);

	const equal = crypto.subtle.timingSafeEqual(paddedA, paddedB);
	// Both buffers must match AND have the same original length
	return equal && bufA.length === bufB.length;
}

export type AuthVariables = {
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

	if (!(await timingSafeEqual(apiKey, expected))) {
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
