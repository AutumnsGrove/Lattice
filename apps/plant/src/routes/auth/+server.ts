/**
 * Legacy OAuth Initiation Route
 *
 * This route previously handled the Heartwood PKCE OAuth flow.
 * With Better Auth, LoginGraft on the homepage handles auth initiation
 * directly via auth-api.grove.place — this route is no longer used.
 *
 * Redirects to the homepage where the LoginGraft lives.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  redirect(302, "/");
};
