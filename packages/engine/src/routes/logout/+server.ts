/**
 * Logout redirect - forwards to /auth/logout
 *
 * The Header component links to /logout by default, so this route
 * exists to redirect to the actual logout handler at /auth/logout.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// GET → 302: browser follows as GET, hitting the GET fallback at /auth/logout
export const GET: RequestHandler = async () => {
  redirect(302, "/auth/logout");
};

// POST → 307: preserves POST method, hitting the primary POST handler at /auth/logout
export const POST: RequestHandler = async () => {
  redirect(307, "/auth/logout");
};
