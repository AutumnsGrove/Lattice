/**
 * Settings Routes - Account settings and passkey management
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { getSettingsPageHTML } from "../templates/settings.js";
import { createAuth } from "../auth/index.js";

const settings = new Hono<{ Bindings: Env }>();

/**
 * GET /settings - Display account settings page
 */
settings.get("/", async (c) => {
  const auth = createAuth(c.env);

  // Get current session
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    // Not authenticated - show login prompt
    return c.html(
      getSettingsPageHTML({
        authBaseUrl: c.env.AUTH_BASE_URL,
      }),
    );
  }

  // Render settings page with user info
  return c.html(
    getSettingsPageHTML({
      authBaseUrl: c.env.AUTH_BASE_URL,
      user: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      },
    }),
  );
});

export default settings;
