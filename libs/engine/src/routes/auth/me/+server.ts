/**
 * GET /auth/me - Return current authenticated user info
 *
 * Uses the user populated by hooks.server.ts from Heartwood OAuth
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ authenticated: false }, { status: 401 });
  }

  return json({
    authenticated: true,
    user: {
      id: locals.user.id,
      email: locals.user.email,
      name: locals.user.name,
      picture: locals.user.picture,
      provider: locals.user.provider,
    },
  });
};
