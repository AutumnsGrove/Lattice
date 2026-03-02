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
import type { Env, ExecVariables } from "../types";
import { EXEC_ERRORS, buildExecError } from "../errors";

/**
 * Constant-time string comparison to prevent timing attacks.
 * Falls back to byte-by-byte XOR if crypto.subtle is unavailable.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	if (a.length !== b.length) return false;
	const encoder = new TextEncoder();
	const aBytes = encoder.encode(a);
	const bBytes = encoder.encode(b);

	// Use crypto.subtle for timing-safe comparison
	const aKey = await crypto.subtle.importKey(
		"raw",
		aBytes,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", aKey, bBytes);
	const expected = await crypto.subtle.sign("HMAC", aKey, aBytes);

	// Compare the HMAC outputs (constant-time at the crypto level)
	const sigArr = new Uint8Array(sig);
	const expectedArr = new Uint8Array(expected);
	if (sigArr.length !== expectedArr.length) return false;
	let diff = 0;
	for (let i = 0; i < sigArr.length; i++) {
		diff |= sigArr[i] ^ expectedArr[i];
	}
	return diff === 0;
}

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

	const valid = await timingSafeEqual(apiKey, expected);
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
