/**
 * The session cookies this hub issues, and how to take them back.
 *
 * Heartwood sets them cross-subdomain — `domain=.grove.place`, `path=/` — except
 * in local dev, where it does not. A browser treats a deletion with a different
 * `domain` as a *different cookie*, so `cookies.delete(name, { path: "/" })`
 * leaves the original in place: the person stays "signed in" with a session the
 * hub refuses to honour, and the next sign-in looks like it half-worked (#1719).
 *
 * Both callers need the same answer, so it is written once here.
 */

/** Every cookie name that carries a session into login.grove.place. */
export const SESSION_COOKIE_NAMES = [
	"better-auth.session_token",
	"__Secure-better-auth.session_token",
	"grove_session",
] as const;

/**
 * The attributes a deletion has to match to remove a Heartwood session cookie.
 *
 * `hostname` decides the domain because that is how Heartwood configured it —
 * cross-subdomain in production, plain in local dev.
 */
export function sessionCookieAttributes(hostname: string): {
	path: string;
	domain?: string;
} {
	const local = hostname === "localhost" || hostname === "127.0.0.1";
	return local ? { path: "/" } : { path: "/", domain: ".grove.place" };
}

/** Delete every session cookie this hub knows about, domain included. */
export function clearSessionCookies(
	cookies: { delete(name: string, options: { path: string; domain?: string }): void },
	hostname: string,
): void {
	const options = sessionCookieAttributes(hostname);
	for (const name of SESSION_COOKIE_NAMES) {
		cookies.delete(name, options);
	}
}
