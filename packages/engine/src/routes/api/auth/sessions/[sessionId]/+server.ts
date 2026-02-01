/**
 * DELETE /api/auth/sessions/:sessionId
 *
 * Revoke a specific session.
 * Proxies to GroveAuth's DELETE /session/:sessionId endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ params, cookies, platform }) => {
  const { sessionId } = params;
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!sessionId) {
    return json({ error: "Session ID required" }, { status: 400 });
  }

  if (!platform?.env?.AUTH) {
    console.error("[Sessions] AUTH service binding not available");
    return json({ error: "Auth service unavailable" }, { status: 503 });
  }

  try {
    const response = await platform.env.AUTH.fetch(
      `https://auth-api.grove.place/session/${sessionId}`,
      {
        method: "DELETE",
        headers: { Cookie: `grove_session=${groveSession}` },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return json(
        { error: data.error || "Failed to revoke session" },
        { status: response.status },
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error("[Sessions] Failed to revoke session:", err);
    return json({ error: "Failed to revoke session" }, { status: 500 });
  }
};
