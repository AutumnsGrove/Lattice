/**
 * Security Middleware - Security headers and protections
 */

import type { MiddlewareHandler } from "hono";
import { resolveClientIP } from "@autumnsgrove/lattice/server";
import type { Env } from "../types.js";
import { SECURITY_HEADERS } from "../utils/constants.js";

/**
 * Add security headers to all responses
 */
export const securityHeaders: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	await next();

	// Add security headers
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		c.res.headers.set(key, value);
	}
};

/**
 * Extract client IP address from request
 *
 * Delegates to the shared engine resolver, which refuses to hand back
 * Cloudflare's own Worker address (`2a06:98c0:3600::103`) as if it were a
 * client. Requests that arrive over a service binding get that address in
 * `cf-connecting-ip` unless the caller forwards the real one, and a rate
 * limiter keyed on it is a rate limiter with a single global bucket (#1679).
 *
 * "unknown" is a deliberate sentinel here: callers persist it and use it as a
 * rate-limit key part, and a shared bucket is honest where a fabricated IP
 * would not be.
 */
export function getClientIP(request: Request): string {
	return resolveClientIP(request).ip ?? "unknown";
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
	return request.headers.get("User-Agent") || "unknown";
}
