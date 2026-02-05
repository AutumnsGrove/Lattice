/**
 * Logout redirect - forwards to /auth/logout
 *
 * The Header component links to /logout by default, so this route
 * exists to redirect to the actual logout handler at /auth/logout.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  redirect(302, "/auth/logout");
};
