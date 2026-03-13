/**
 * Security Middleware
 *
 * Adds security headers to all responses.
 * Mirrors heartwood's security middleware pattern.
 */

import type { MiddlewareHandler } from "hono";
import type { Env } from "../types.js";

/**
 * Security headers for API responses.
 * Stricter than a UI worker — no script-src or style-src needed.
 */
const SECURITY_HEADERS = {
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(), microphone=(), camera=()",
	"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

/**
 * Add security headers to all responses
 */
export const securityHeaders: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	await next();

	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		c.res.headers.set(key, value);
	}
};
