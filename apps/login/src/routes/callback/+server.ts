/**
 * Post-Auth Callback — login.grove.place/callback
 *
 * This endpoint is where better-auth redirects after OAuth completion.
 * It verifies a session cookie exists, then redirects the user to their
 * intended destination (passed via ?redirect= query param).
 *
 * Since #1719 it also asks Heartwood whether the session it is about to trust is
 * honoured at all. A ban is enforced at validation, so a banned Wanderer arrives
 * here holding a cookie that means nothing; forwarding them on produced the
 * silent loop this route now ends.
 *
 * Security: Only redirects to *.grove.place domains to prevent open redirects.
 */

import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";
import { validateRedirectUrl } from "$lib/redirect";

/**
 * Better Auth's own OAuth failure codes.
 *
 * These describe a round-trip that did not finish — the person cancelled the
 * consent screen, the state did not match, the provider was unreachable — and
 * none of them means "this account is refused". Anything else arriving as
 * `?error=` is our own hooks talking: an APIError thrown from `user.create`
 * reaches the browser as its *message* with spaces turned into underscores,
 * because Better Auth keeps only the text on the redirect path.
 */
const BENIGN_OAUTH_ERRORS = new Set([
	"access_denied",
	"invalid_request",
	"invalid_scope",
	"server_error",
	"temporarily_unavailable",
	"state_mismatch",
	"state_not_found",
	"no_code",
	"invalid_code",
	"no_callback_url",
	"no_state",
	"oauth_provider_not_found",
	"no_session",
]);

const DEFAULT_AUTH_URL = "https://login.grove.place";

/** Auth cookies to send to Heartwood for the validation check. */
function authCookieHeader(cookies: { get(name: string): string | undefined }): string {
	const names = [
		"better-auth.session_token",
		"__Secure-better-auth.session_token",
		"grove_session",
		"session_token",
	];
	return names
		.map((name) => {
			const value = cookies.get(name);
			return value ? `${name}=${value}` : null;
		})
		.filter((pair): pair is string => pair !== null)
		.join("; ");
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	// Try query param first, then fall back to cookie.
	// The cookie fallback handles the case where Better Auth's OAuth redirect
	// drops the ?redirect= query parameter from the callbackURL.
	const redirectParam = url.searchParams.get("redirect");
	const redirectCookie = cookies.get("grove_auth_redirect");
	// The cookie value is stored with encodeURIComponent() by the login page,
	// so we must decode it before validation (e.g. "%2Ffeed" → "/feed").
	const decodedCookie = redirectCookie ? decodeURIComponent(redirectCookie) : undefined;
	const redirectTo = validateRedirectUrl(redirectParam || decodedCookie, dev);

	// Clean up the fallback cookie now that we've read it
	if (redirectCookie) {
		cookies.delete("grove_auth_redirect", { path: "/" });
	}

	const hasSession =
		cookies.get("better-auth.session_token") || cookies.get("__Secure-better-auth.session_token");

	// A session that exists is not the same as a session that works. Ask, so the
	// answer is "this account isn't available" rather than a grove that bounces
	// them back to an unexplained form (#1719).
	let banned = false;
	if (hasSession && platform?.env?.AUTH) {
		const authBaseUrl = platform.env.GROVEAUTH_URL ?? DEFAULT_AUTH_URL;
		try {
			const response = await platform.env.AUTH.fetch(`${authBaseUrl}/session/validate`, {
				method: "POST",
				headers: { Cookie: authCookieHeader(cookies), "Content-Type": "application/json" },
				body: "{}",
				redirect: "manual",
			});
			if (response.ok) {
				const body = (await response.json()) as { valid?: boolean; reason?: string };
				banned = body.reason === "banned";
			}
		} catch {
			// A failed check must not block a real sign-in. The destination app asks
			// again on its own; this route is being helpful, not authoritative.
		}
	}

	if (banned) {
		throw redirect(302, "/?unavailable=1");
	}

	const oauthError = url.searchParams.get("error");
	if (!hasSession && oauthError && !BENIGN_OAUTH_ERRORS.has(oauthError)) {
		// A refusal from our own hooks, on the one path where Better Auth keeps the
		// text and drops the code.
		throw redirect(302, "/?unavailable=1");
	}

	if (!hasSession) {
		// No session — something went wrong during auth
		// Redirect back to sign-in with an error hint
		throw redirect(302, `/?error=no_session&redirect=${encodeURIComponent(redirectTo)}`);
	}

	// Session exists and is honoured — send them on their way
	throw redirect(302, redirectTo);
};
