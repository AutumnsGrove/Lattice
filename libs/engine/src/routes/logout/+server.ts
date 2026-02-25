/**
 * Logout redirect - forwards POST to /auth/logout
 *
 * The Header/MobileMenu components default to action="/logout",
 * so this route redirects to the actual logout handler at /auth/logout.
 *
 * GET requests redirect to home without logging out (prevents CSRF).
 * POST requests forward to the real logout handler via 307.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// GET → 302 to home: graceful fallback for bookmarks, stale links, etc.
// Does NOT perform logout — that requires POST to prevent CSRF.
export const GET: RequestHandler = async () => {
	redirect(302, "/");
};

// POST → 307: preserves POST method, hitting the POST handler at /auth/logout
export const POST: RequestHandler = async () => {
	redirect(307, "/auth/logout");
};
