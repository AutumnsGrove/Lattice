/**
 * Why a session did not validate, when the answer is "this account is banned".
 *
 * `validateSession` returns `null` for a banned account, which is exactly right
 * for every caller that only needs "is this request signed in". It is not enough
 * for the login hub, which has to tell the person *something*: today a banned
 * Wanderer signs in successfully, is treated as signed out, and lands back on the
 * form with no explanation — a loop with no exit and no way to ask for help
 * (#1719).
 *
 * This is deliberately a second question rather than a change to the first one.
 * Answering "yes, and here is why" must never become "yes" to `validateSession`.
 */

import type { Env } from "../../types.js";
import { isUserBanned } from "../../db/queries.js";

/**
 * The raw session token from a Better Auth cookie.
 *
 * A copy of `getSessionToken` in `lib/server/session.ts` rather than an import:
 * that file is 2-space indented throughout and any edit to it makes `prettier
 * --check` want to reformat 400 lines of unrelated code. Moving the helper out
 * belongs with the `session.ts` split on the code-shape hitlist, not in this
 * change.
 *
 * Better Auth signs cookies as `token.signature`, so the part before the first
 * dot is what the database stores.
 */
function sessionTokenFromRequest(request: Request): string | null {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) return null;

	const cookies = Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [key, ...value] = c.trim().split("=");
			return [key, value.join("=")];
		}),
	);

	const signed =
		cookies["better-auth.session_token"] ||
		cookies["__Secure-better-auth.session_token"] ||
		cookies["session_token"] ||
		null;

	if (!signed) return null;
	return signed.split(".")[0] || null;
}

/**
 * Is the request carrying a live Better Auth session for a banned account?
 *
 * False for every other case — no cookie, an unknown token, an expired session,
 * a healthy account — so a caller can treat `true` as a definite refusal.
 */
export async function isBannedBetterAuthSession(request: Request, env: Env): Promise<boolean> {
	const token = sessionTokenFromRequest(request);
	if (!token) return false;

	const row = await env.DB.prepare(
		`SELECT u.id AS user_id
		   FROM ba_session s
		   JOIN ba_user u ON u.id = s.user_id
		  WHERE s.token = ?
		    AND s.expires_at > ?
		  LIMIT 1`,
	)
		.bind(token, Math.floor(Date.now() / 1000))
		.first<{ user_id: string }>();

	if (!row) return false;

	// `isUserBanned` already honours `ban_expires`: a temporary ban that has run
	// out is a valid session again, and reporting it as a refusal would lock
	// someone out of an account they are allowed back into.
	return isUserBanned(env.DB, row.user_id);
}
