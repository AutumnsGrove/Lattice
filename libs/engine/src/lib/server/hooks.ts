/**
 * Grove Hooks Utilities
 *
 * Shared helpers for SvelteKit hooks.server.ts files.
 * Import via: import { ... } from "@autumnsgrove/lattice/server"
 */

/** Parse a specific cookie by name from the cookie header (word-boundary safe). */
export function getCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	// Word boundary ((?:^|;\s*)) prevents matching substrings,
	// e.g. "session=" must not match inside "grove_session="
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
	return match ? match[1] : null;
}

/** Extract the Grove or Better Auth session cookie from a cookie header. */
export function extractSessionCookie(cookieHeader: string | null): string | null {
	const groveSession = getCookie(cookieHeader, "grove_session");
	const betterAuthSession =
		getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
		getCookie(cookieHeader, "better-auth.session_token");
	return groveSession || betterAuthSession;
}

/** Apply the five core Grove security headers to a response. */
export function setSecurityHeaders(response: Response): Response {
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	return response;
}

/**
 * Minimal shape of the Cloudflare Workers edge cache we rely on.
 *
 * We deliberately avoid referencing the ambient `caches`/`CacheStorage`
 * globals directly: this package also ships browser Svelte components, so
 * its tsconfig includes the DOM lib alongside `@cloudflare/workers-types`.
 * DOM's `CacheStorage` interface has no `default` property, and it wins the
 * ambient declaration over Cloudflare's — so `caches.default` fails to
 * typecheck here even though it exists at runtime. Casting through
 * `globalThis` sidesteps the collision.
 */
interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

/**
 * Undefined outside Workers (e.g. plain Node under `vite dev`, where there is
 * no Cache API). Callers skip caching and validate against Heartwood directly.
 */
function getEdgeCache(): EdgeCache | undefined {
	return (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
}

/** SHA-256 hex digest, used to key the session-validation cache without storing raw tokens. */
async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Validate a Grove session via the Heartwood AUTH service binding.
 *
 * Two things this fixes over a bare `auth.fetch(...)` call:
 *
 * 1. Service-binding requests never touch Cloudflare's edge, so
 *    `CF-Connecting-IP` is never auto-injected the way it is for normal
 *    internet-facing requests. Without forwarding it explicitly, Heartwood's
 *    `getClientIP()` falls back to the literal string "unknown" — meaning
 *    its per-IP rate limit on /session/validate becomes one shared bucket
 *    across every caller on the platform, not a per-user limit. We forward
 *    the original request's client IP so the limit applies per real client.
 *
 * 2. Every request through a Grove app's hooks.server.ts re-validates the
 *    session from scratch (page loads, API calls, etc.). A burst of
 *    near-simultaneous requests from one browser — e.g. several admin tabs
 *    opened at once — turns into a burst of validate calls. We cache
 *    successful validations for a few seconds via the Workers Cache API,
 *    keyed by a hash of the session token, so that burst only pays for one
 *    round trip to Heartwood.
 */
export async function validateGroveSession(
	auth: Fetcher,
	request: Request,
	sessionCookie: string,
	cookieHeader: string,
	waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response | null> {
	const clientIp =
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Real-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"";

	const cache = getEdgeCache();
	const cacheKey = new Request(
		`https://session-validate.internal/${await sha256Hex(sessionCookie)}`,
	);

	const cached = cache ? await cache.match(cacheKey) : undefined;
	if (cached) return cached;

	let response: Response;
	try {
		response = await auth.fetch("https://login.grove.place/session/validate", {
			method: "POST",
			headers: {
				Cookie: cookieHeader,
				...(clientIp ? { "CF-Connecting-IP": clientIp } : {}),
			},
		});
	} catch (err) {
		console.error("[Auth] SessionDO validation error:", err);
		return null;
	}

	// Only cache successful validations — a rate-limited or failed check
	// should never be remembered, or a transient hiccup would lock the
	// user out for the full cache window.
	if (cache && response.ok) {
		const cacheable = new Response(response.clone().body, {
			status: response.status,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "private, max-age=5",
			},
		});
		const putPromise = cache.put(cacheKey, cacheable);
		if (waitUntil) {
			waitUntil(putPromise);
		} else {
			await putPromise;
		}
	}

	return response;
}

/** Matches https://<single-level-subdomain>.grove.place — prevents nested subdomain abuse. */
export const GROVE_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.grove\.place$/;

/** True for any valid https://*.grove.place origin (single-level subdomain only). */
export function isGroveOrigin(origin: string): boolean {
	return GROVE_ORIGIN_RE.test(origin);
}

/** True for localhost and 127.0.0.1 origins (local development). */
export function isLocalOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}
