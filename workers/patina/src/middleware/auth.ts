/**
 * Authentication Middleware
 *
 * Protects sensitive endpoints with API key authentication.
 */

import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Require API key for protected endpoints.
 * API key should be passed in Authorization header as: Bearer <key>
 */
export async function requireApiKey(c: Context<{ Bindings: Env }>, next: Next) {
	const apiKey = c.env.API_KEY;

	// If no API key is configured, block all access to protected endpoints
	if (!apiKey) {
		return c.json(
			{
				error: "API key not configured",
				message: "Set API_KEY secret via: wrangler secret put API_KEY",
			},
			503,
		);
	}

	// Check Authorization header
	const authHeader = c.req.header("Authorization");

	if (!authHeader) {
		return c.json(
			{
				error: "Unauthorized",
				message: "Missing Authorization header. Use: Authorization: Bearer <api-key>",
			},
			401,
		);
	}

	// Parse Bearer token
	const [scheme, token] = authHeader.split(" ");

	if (scheme !== "Bearer" || !token) {
		return c.json(
			{
				error: "Unauthorized",
				message: "Invalid Authorization header format. Use: Authorization: Bearer <api-key>",
			},
			401,
		);
	}

	// Constant-time comparison to prevent timing attacks
	if (!secureCompare(token, apiKey)) {
		return c.json(
			{
				error: "Unauthorized",
				message: "Invalid API key",
			},
			401,
		);
	}

	// Authentication successful
	await next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}
