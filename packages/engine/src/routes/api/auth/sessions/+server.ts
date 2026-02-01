/**
 * GET /api/auth/sessions
 *
 * List all active sessions for the current user.
 * Proxies to GroveAuth's /session/list endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    return json({ sessions: [] }, { status: 401 });
  }

  if (!platform?.env?.AUTH) {
    console.error("[Sessions] AUTH service binding not available");
    return json({ error: "Auth service unavailable" }, { status: 503 });
  }

  try {
    const response = await platform.env.AUTH.fetch(
      "https://auth-api.grove.place/session/list",
      {
        method: "GET",
        headers: { Cookie: `grove_session=${groveSession}` },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return json(
        { sessions: [], error: data.error || "Failed to fetch sessions" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { sessions?: unknown[] };
    return json({ sessions: data.sessions || [] });
  } catch (err) {
    console.error("[Sessions] Failed to fetch sessions:", err);
    return json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
};
