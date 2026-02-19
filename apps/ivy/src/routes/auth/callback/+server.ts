/**
 * Auth Callback
 *
 * Handles OAuth callback from Better Auth.
 * Better Auth handles the full OAuth flow and sets session cookies automatically.
 * This endpoint just redirects back to the app after successful authentication.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	// Better Auth has already set the session cookie via its OAuth flow
	// We just need to redirect the user back to the app
	const callbackURL = url.searchParams.get("callbackURL") || "/inbox";

	throw redirect(302, callbackURL);
};
