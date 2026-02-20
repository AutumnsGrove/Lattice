/**
 * Meadow Server Hooks
 *
 * Authentication via Heartwood SessionDO service binding.
 * CSRF validation on state-changing requests.
 */

import type { Handle } from "@sveltejs/kit";
import { validateCSRF } from "@autumnsgrove/lattice/utils";

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
	return match ? match[1] : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize user as null
	event.locals.user = null;

	// CSRF validation for state-changing requests
	if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
		if (!validateCSRF(event.request)) {
			return new Response(
				JSON.stringify({
					error: "GROVE-API-030",
					error_code: "CSRF_BLOCKED",
					error_description: "Cross-site request blocked.",
				}),
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}
	}

	const cookieHeader = event.request.headers.get("cookie");

	// =========================================================================
	// AUTHENTICATION (Heartwood SessionDO)
	// =========================================================================
	const groveSession = getCookie(cookieHeader, "grove_session");
	const betterAuthSession =
		getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
		getCookie(cookieHeader, "better-auth.session_token");
	const sessionCookie = groveSession || betterAuthSession;

	if (sessionCookie && !event.platform?.env?.AUTH) {
		console.error("[Meadow Auth] AUTH service binding not available");
		event.locals.authError = "auth_binding_unavailable";
	}

	if (sessionCookie && event.platform?.env?.AUTH) {
		try {
			// URL is a routing identifier for the AUTH service binding (Worker-to-Worker).
			// Traffic goes through the binding, not the public internet.
			const response = await event.platform.env.AUTH.fetch(
				"https://login.grove.place/session/validate",
				{
					method: "POST",
					headers: { Cookie: cookieHeader || "" },
				},
			);

			if (response.ok) {
				const data = (await response.json()) as {
					valid: boolean;
					user?: {
						id: string;
						email: string;
						name: string;
						avatarUrl: string;
						isAdmin: boolean;
						tenantId: string | null;
						subdomain: string | null;
					};
				};

				if (data.valid && data.user) {
					event.locals.user = {
						id: data.user.id,
						email: data.user.email,
						name: data.user.name || null,
						tenantId: data.user.tenantId ?? null,
						subdomain: data.user.subdomain ?? null,
					};
				}
			}
		} catch (err) {
			console.error("[Meadow Auth] SessionDO validation error:", err);
			event.locals.authError = "session_validation_failed";
		}
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

	return response;
};
