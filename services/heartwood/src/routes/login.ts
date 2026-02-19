/**
 * Login Route - Redirect to Heartwood Frontend
 *
 * This route redirects all login requests to the SvelteKit frontend
 * at heartwood.grove.place, which has the proper login UI with
 * Passkey + Google authentication.
 *
 * The frontend handles:
 * - Legacy OAuth params (client_id, redirect_uri, state, code_challenge)
 * - Simple returnTo param for redirects
 * - Passkey authentication (primary)
 * - Google OAuth (fallback)
 */

import { Hono } from "hono";
import type { Env } from "../types.js";

const login = new Hono<{ Bindings: Env }>();

/**
 * GET /login - Redirect to frontend login page
 *
 * Preserves all query params so the frontend can handle OAuth flows.
 */
login.get("/", async (c) => {
  const frontendUrl = "https://heartwood.grove.place/login";

  // Preserve all query params from the original request
  const queryString = c.req.url.split("?")[1];
  const redirectUrl = queryString
    ? `${frontendUrl}?${queryString}`
    : frontendUrl;

  return c.redirect(redirectUrl, 302);
});

export default login;
