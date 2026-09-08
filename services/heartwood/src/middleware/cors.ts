/**
 * CORS Middleware - Cross-Origin Resource Sharing
 */

import type { MiddlewareHandler } from "hono";
import { safeParseJson } from "@autumnsgrove/lattice/utils";
import type { Env } from "../types.js";
import { getClientByClientId } from "../db/queries.js";

/**
 * Dynamic CORS middleware based on registered client origins
 */
export const corsMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	const origin = c.req.header("Origin");
	const isLocalDev = c.env?.AUTH_BASE_URL?.startsWith("http://localhost") ?? false;

	// Handle preflight requests
	if (c.req.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: getCorsHeaders(origin, isLocalDev),
		});
	}

	await next();

	// Add CORS headers to response
	const corsHeaders = getCorsHeaders(origin, isLocalDev);
	for (const [key, value] of Object.entries(corsHeaders)) {
		c.res.headers.set(key, value);
	}
};

/**
 * Explicitly allowed origins for CORS
 * These correspond to registered client applications in the Grove ecosystem
 */
const ALLOWED_ORIGINS = [
	"https://heartwood.grove.place",
	"https://groveengine.grove.place",
	"https://plant.grove.place",
	"https://autumnsgrove.com",
	"https://amber.grove.place",
	"https://autumn.grove.place", // Property site
] as const;

function isLocalhost(origin: string): boolean {
	try {
		const url = new URL(origin);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

/**
 * Get CORS headers for a given origin
 *
 * Validates against an explicit list of allowed origins only — no
 * *.grove.place wildcard. Tenant blog subdomains (<tenant>.grove.place) are
 * user-controlled and share the grove_session cookie's Domain=.grove.place
 * scope, so granting them credentialed CORS would let any tenant site read
 * session-authenticated Heartwood responses (including /admin/*) for a
 * visiting admin. localhost is only trusted when AUTH_BASE_URL itself
 * points at localhost (local dev), never in a deployed environment.
 */
function getCorsHeaders(origin: string | undefined, isLocalDev: boolean): Record<string, string> {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
		// Allow-Origin varies per-request (echoed from an allowlist check), so
		// any cache sitting in front of this worker must key on Origin too —
		// otherwise a response cached for one origin could be served to another.
		Vary: "Origin",
	};

	if (
		origin &&
		(ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number]) ||
			(isLocalDev && isLocalhost(origin)))
	) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Credentials"] = "true";
	}

	return headers;
}

/**
 * Validate origin against registered client
 */
export async function validateOriginForClient(
	db: D1Database,
	clientId: string,
	origin: string,
): Promise<boolean> {
	const client = await getClientByClientId(db, clientId);
	if (!client) return false;

	const allowedOrigins = safeParseJson<string[]>(client.allowed_origins, []);
	return allowedOrigins.includes(origin);
}
