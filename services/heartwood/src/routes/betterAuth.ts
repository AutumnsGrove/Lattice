/**
 * Better Auth Routes
 *
 * This route handler integrates Better Auth with the Hono app,
 * providing the new /api/auth/* endpoints for authentication.
 *
 * Endpoints handled by Better Auth:
 * - POST /api/auth/sign-in/social - OAuth sign-in (Google, GitHub)
 * - GET /api/auth/callback/:provider - OAuth callbacks
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/sign-out - Sign out
 * - And more...
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { requestWithClientIp, resolveClientIPorLog } from "@autumnsgrove/lattice/server";
import { createAuth } from "../auth/index.js";
import {
	registerRequestForBridge,
	getSessionBridgeResult,
	cleanupRequestContext,
	redactId,
} from "../lib/sessionBridge.js";
import {
	createSessionCookieHeader,
	clearSessionCookieHeader,
	getSessionFromRequest,
} from "../lib/session.js";
import type { SessionDO } from "../durables/SessionDO.js";

const betterAuthRoutes = new Hono<{ Bindings: Env }>();

/**
 * Extract the hostname from a callbackURL query param, or null if it's
 * missing/unparseable. Used to pick the error-redirect base by an exact
 * hostname match rather than `callbackURL.includes("plant.grove.place")`,
 * which a crafted URL like `https://evil.com/?x=plant.grove.place` would
 * also match (not exploitable as an open redirect — errorBase is always one
 * of three fixed values — but exact matching is the honest check).
 */
function getCallbackHostname(callbackURL: string | null): string | null {
	if (!callbackURL) return null;
	try {
		return new URL(callbackURL).hostname;
	} catch {
		return null;
	}
}

// Bound how much of a 5xx response body gets logged — BA's own responses are
// generic today, but nothing guarantees a future error payload stays small.
const MAX_LOGGED_BODY_LENGTH = 500;

/**
 * Better Auth's /sign-out only clears its own cookies (better-auth.session_token)
 * and deletes the ba_session row. It never touches grove_session — which is a
 * fully sufficient standalone credential for every grove_session-gated route
 * (admin cookie auth, /session/*, device authorization). Without this, a user
 * who signs out via Better Auth keeps a live 30-day grove_session cookie.
 */
async function clearGroveSessionOnSignOut(
	request: Request,
	env: Env,
	response: Response,
): Promise<Response> {
	const parsedSession = await getSessionFromRequest(request, env.SESSION_SECRET);
	if (parsedSession) {
		try {
			const sessionDO = env.SESSIONS.get(
				env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
			) as DurableObjectStub<SessionDO>;
			await sessionDO.revokeSession(parsedSession.sessionId);
		} catch (error) {
			console.error("[BetterAuth] Failed to revoke grove_session on sign-out:", error);
		}
	}

	const newHeaders = new Headers(response.headers);
	newHeaders.append("Set-Cookie", clearSessionCookieHeader());
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

/**
 * Catch-all handler for Better Auth endpoints
 *
 * Better Auth provides its own request handler that processes
 * all authentication-related requests under the /api/auth/* path.
 *
 * SessionDO Bridge:
 * When BA creates a session (OAuth), the database hook bridges it to SessionDO.
 * We then append the grove_session cookie to the response so users get both cookies.
 */
betterAuthRoutes.all("/*", async (c) => {
	// Declared outside the try so the error path can still find the bridged
	// request it may need to clean up or revoke.
	let handlerRequest: Request | undefined;

	try {
		// Extract geolocation fields from Cloudflare request context
		const rawCf = c.req.raw.cf;
		const cf = rawCf
			? {
					timezone: rawCf.timezone as string | undefined,
					city: rawCf.city as string | undefined,
					country: rawCf.country as string | undefined,
					region: rawCf.region as string | undefined,
					regionCode: rawCf.regionCode as string | undefined,
					colo: rawCf.colo as string | undefined,
					latitude: rawCf.latitude as string | undefined,
					longitude: rawCf.longitude as string | undefined,
				}
			: undefined;

		console.log("[BetterAuth] Request:", c.req.method, c.req.path);

		// Resolve the client IP once, here, and hand Better Auth a request whose
		// IP headers mean what we think they mean (#1679).
		//
		// On a Worker→Worker subrequest Cloudflare replaces `cf-connecting-ip`
		// with its own egress address (2a06:98c0:3600::103), so Better Auth's
		// per-IP rate limits collapse into one global bucket and every
		// ba_session.ip_address records the same non-client. The shared resolver
		// prefers a Worker-forwarded address in that case, and returns nothing
		// rather than the sentinel when there is no real one — which we log,
		// because a silent fallthrough to a shared bucket is how this went
		// unnoticed for months.
		resolveClientIPorLog(c.req.raw, "BetterAuth");
		handlerRequest = requestWithClientIp(c.req.raw);

		// Register this request for SessionDO bridging. The registry is keyed on
		// the Request object itself (WeakMap), so it has to be the same object
		// Better Auth handles and the same one read back below.
		registerRequestForBridge(handlerRequest, c.env);

		// Create auth instance with current environment bindings and CF context.
		// The `cf` object is read from the original request — rebuilding the
		// request for its headers drops it.
		const auth = createAuth(c.env, cf);

		// Better Auth handler expects a standard Request and returns a Response
		let response = await auth.handler(handlerRequest);

		// Check if a SessionDO session was created by the hook
		// If so, append the grove_session cookie to the response
		const bridgeResult = getSessionBridgeResult(handlerRequest);
		if (bridgeResult && bridgeResult.sessionId && !bridgeResult.error) {
			try {
				const cookieHeader = await createSessionCookieHeader(
					bridgeResult.sessionId,
					bridgeResult.userId,
					c.env.SESSION_SECRET,
				);

				// Clone response and append our cookie
				const newHeaders = new Headers(response.headers);
				newHeaders.append("Set-Cookie", cookieHeader);

				response = new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});

				// Log with redacted ID to prevent exposure in log aggregation
				console.log(
					"[BetterAuth] Added grove_session cookie for user",
					redactId(bridgeResult.userId),
				);
			} catch (cookieError) {
				// Log but don't fail - BA session is still valid
				console.error("[BetterAuth] Failed to add grove_session cookie:", cookieError);
			}
		}

		// Better Auth's /sign-out never touches grove_session — mirror that
		// teardown here so signing out actually signs out of every mechanism.
		if (c.req.method === "POST" && c.req.path.endsWith("/sign-out") && response.ok) {
			response = await clearGroveSessionOnSignOut(handlerRequest, c.env, response);
		}

		// This route serves per-user session/auth data through a catch-all —
		// nothing should cache it.
		if (!response.headers.has("Cache-Control")) {
			const newHeaders = new Headers(response.headers);
			newHeaders.set("Cache-Control", "no-store");
			response = new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		}

		// Clean up request context to prevent memory leaks
		cleanupRequestContext(handlerRequest);

		// Log response status for debugging
		console.log("[BetterAuth] Response status:", response.status);

		// If it's a 500 error, try to get more details
		if (response.status >= 500) {
			const clonedResponse = response.clone();
			try {
				const body = await clonedResponse.text();
				console.error(
					"[BetterAuth] 5xx response body:",
					(body || "(empty)").slice(0, MAX_LOGGED_BODY_LENGTH),
				);
			} catch (e) {
				console.error("[BetterAuth] Could not read response body");
			}
		}

		return response;
	} catch (error) {
		// If the SessionDO bridge already succeeded before this throw (e.g. BA
		// failed while serializing its own response after the session.create
		// hook ran), that session was never delivered as a cookie and never
		// will be — revoke it so it doesn't linger as a phantom device in
		// /session/list.
		const orphanedBridge = handlerRequest ? getSessionBridgeResult(handlerRequest) : undefined;
		if (orphanedBridge?.sessionId && !orphanedBridge.error) {
			try {
				const sessionDO = c.env.SESSIONS.get(
					c.env.SESSIONS.idFromName(`session:${orphanedBridge.userId}`),
				) as DurableObjectStub<SessionDO>;
				await sessionDO.revokeSession(orphanedBridge.sessionId);
			} catch (revokeError) {
				console.error(
					"[BetterAuth] Failed to revoke orphaned session after handler error:",
					revokeError,
				);
			}
		}
		if (handlerRequest) cleanupRequestContext(handlerRequest);

		// Log the actual error for debugging
		console.error("[BetterAuth] Handler error:", error);
		console.error("[BetterAuth] Error stack:", error instanceof Error ? error.stack : "No stack");
		console.error("[BetterAuth] Request path:", c.req.path);

		// For browser-navigated OAuth callbacks,
		// redirect to an error page instead of returning JSON (which triggers download)
		const isGetNavigation = c.req.method === "GET";
		const isOAuthCallback = c.req.path.includes("/callback/");

		if (isGetNavigation && isOAuthCallback) {
			const callbackURL = new URL(c.req.url).searchParams.get("callbackURL");
			const isLocalDev = c.env.AUTH_BASE_URL?.startsWith("http://localhost");
			let errorBase: string;
			if (isLocalDev) {
				errorBase = c.env.AUTH_BASE_URL;
			} else if (getCallbackHostname(callbackURL) === "plant.grove.place") {
				errorBase = "https://plant.grove.place";
			} else {
				errorBase = "https://heartwood.grove.place";
			}
			const errorUrl = new URL("/login", errorBase);
			// SECURITY: Never leak raw error messages — use a safe generic code
			errorUrl.searchParams.set("error", "auth_failed");
			return c.redirect(errorUrl.toString());
		}

		// SECURITY: Never leak internal error details to clients
		return c.json(
			{
				error: "server_error",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

export default betterAuthRoutes;
