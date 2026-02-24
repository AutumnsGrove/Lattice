/**
 * Logout redirect - forwards POST to /auth/logout
 *
 * The Header/MobileMenu components default to action="/logout",
 * so this route redirects to the actual logout handler at /auth/logout.
 * POST-only — GET logout was removed to prevent CSRF logout attacks.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// POST → 307: preserves POST method, hitting the POST handler at /auth/logout
export const POST: RequestHandler = async () => {
	redirect(307, "/auth/logout");
};
