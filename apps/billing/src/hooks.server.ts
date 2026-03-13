import type { Handle } from "@sveltejs/kit";
import { isGreenhouseMode, GREENHOUSE_AUTH } from "$lib/greenhouse";

/**
 * Server hooks for the Billing app
 *
 * Security headers are set here. CSRF protection is handled by SvelteKit's
 * built-in csrf.trustedOrigins (configured in svelte.config.js).
 * CSP with nonces is handled by SvelteKit's kit.csp config.
 *
 * CORS: The billing hub proxies webhook requests and may receive cross-origin
 * requests from tenant sites redirecting to billing flows. API routes under
 * /api/ get CORS headers for *.grove.place origins.
 *
 * Session validation: For non-API routes, the AUTH service binding validates
 * the user's session cookie and populates locals.tenantId/userId.
 *
 * Lightweight — no DB binding. Session data comes from Heartwood.
 */

/**
 * Check if an origin is a valid HTTPS *.grove.place subdomain.
 * Strict regex: single-level subdomains only (e.g., autumn.grove.place).
 */
const GROVE_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.grove\.place$/;

function isGroveOrigin(origin: string): boolean {
	return GROVE_ORIGIN_RE.test(origin);
}

/** Also allow localhost for local development */
function isLocalOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

/** Check if a request path is an API route that needs CORS */
function isApiRoute(path: string): boolean {
	return path.startsWith("/api/");
}

/** Build CORS headers for a validated origin */
function getCorsHeaders(origin: string): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
		"Access-Control-Max-Age": "86400",
	};
}

/**
 * Validate session via AUTH service binding (Heartwood SessionDO).
 * Uses POST /session/validate — the same endpoint Landing and other
 * Grove properties use. This correctly handles grove_session cookies
 * as well as Better Auth session cookies from OAuth flows.
 */
async function validateSession(
	auth: Fetcher,
	cookieHeader: string | null,
): Promise<{ tenantId: string; userId: string } | undefined> {
	if (!cookieHeader) return undefined;

	try {
		const response = await auth.fetch("https://login.grove.place/session/validate", {
			method: "POST",
			headers: { Cookie: cookieHeader },
		});

		if (!response.ok) return undefined;

		const data = (await response.json()) as {
			valid?: boolean;
			user?: { id?: string; tenantId?: string };
		};

		if (!data.valid || !data.user) return undefined;

		const userId = data.user.id;
		const tenantId = data.user.tenantId;

		if (!userId || !tenantId) return undefined;

		return { tenantId, userId };
	} catch {
		return undefined;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url, platform } = event;
	const origin = request.headers.get("Origin");
	const isApi = isApiRoute(url.pathname);
	const isAllowedOrigin = !!origin && (isGroveOrigin(origin) || isLocalOrigin(origin));

	// Handle CORS preflight (OPTIONS) for API routes
	if (isApi && request.method === "OPTIONS" && isAllowedOrigin) {
		return new Response(null, {
			status: 204,
			headers: getCorsHeaders(origin),
		});
	}

	// Validate session for non-API, non-webhook routes
	if (!isApi && platform?.env?.AUTH) {
		const cookieHeader = request.headers.get("Cookie");
		const session = await validateSession(platform.env.AUTH, cookieHeader);
		if (session) {
			event.locals.tenantId = session.tenantId;
			event.locals.userId = session.userId;
		}
	}

	// Greenhouse Mode: mock auth when toggle is active (dev/test only)
	if (!isApi && !event.locals.tenantId && isGreenhouseMode(event.cookies, platform)) {
		event.locals.tenantId = GREENHOUSE_AUTH.tenantId;
		event.locals.userId = GREENHOUSE_AUTH.userId;
	}

	const response = await resolve(event);

	// Add CORS headers to API route responses for allowed origins
	if (isApi && isAllowedOrigin) {
		const corsHeaders = getCorsHeaders(origin);
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
		response.headers.append("Vary", "Origin");
	}

	// Security headers (CSP is handled by SvelteKit's kit.csp config with nonces)
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

	return response;
};
