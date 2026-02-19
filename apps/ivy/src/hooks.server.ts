/**
 * SvelteKit Server Hooks
 *
 * Authentication via Heartwood SessionDO service binding.
 * Sets locals.isOwner for triage access control.
 */

import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

// Routes that skip session validation entirely
const PUBLIC_ROUTES = ["/auth/callback", "/auth/logout"];

// Routes with their own auth (HMAC signature verification)
const WEBHOOK_ROUTES = ["/api/webhook/"];

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
	return match ? match[1] : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Initialize user as null
	event.locals.user = null;
	event.locals.session = null;
	event.locals.isOwner = false;

	// Skip auth for webhook routes (they have HMAC verification)
	if (WEBHOOK_ROUTES.some((route) => pathname.startsWith(route))) {
		return resolve(event);
	}

	// Skip auth for public routes
	if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
		return resolve(event);
	}

	// Check session with Heartwood via AUTH service binding
	const cookieHeader = event.request.headers.get("cookie");
	const groveSession = getCookie(cookieHeader, "grove_session");
	const betterAuthSession =
		getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
		getCookie(cookieHeader, "better-auth.session_token");
	const sessionCookie = groveSession || betterAuthSession;

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
					};
				};

				if (data.valid && data.user) {
					event.locals.user = {
						id: data.user.id,
						email: data.user.email,
						name: data.user.name || null,
					};
					event.locals.session = { valid: true };

					// Owner check — only the configured owner gets full triage access
					const ownerEmail = event.platform?.env?.OWNER_EMAIL;
					event.locals.isOwner = !!(
						ownerEmail &&
						data.user.email &&
						data.user.email.toLowerCase() === ownerEmail.toLowerCase()
					);
				}
			}
		} catch (err) {
			console.error("[Ivy Auth] SessionDO validation error:", err);
		}
	}

	// No valid session — redirect to login for protected routes
	if (!event.locals.user) {
		if (pathname !== "/" && !pathname.startsWith("/api/")) {
			throw redirect(302, "/");
		}
	}

	return resolve(event);
};
