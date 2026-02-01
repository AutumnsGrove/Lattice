/**
 * POST /api/auth/sessions/revoke-all
 *
 * Revoke all sessions except optionally the current one.
 * Proxies to GroveAuth's POST /session/revoke-all endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!platform?.env?.AUTH) {
    console.error("[Sessions] AUTH service binding not available");
    return json({ error: "Auth service unavailable" }, { status: 503 });
  }

  let keepCurrent = true;
  try {
    const body = (await request.json()) as { keepCurrent?: boolean };
    keepCurrent = body.keepCurrent ?? true;
  } catch {
    // Default to keeping current session
  }

  try {
    const response = await platform.env.AUTH.fetch(
      "https://auth-api.grove.place/session/revoke-all",
      {
        method: "POST",
        headers: {
          Cookie: `grove_session=${groveSession}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keepCurrent }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return json(
        { error: data.error || "Failed to revoke sessions" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { revokedCount?: number };
    return json({
      success: true,
      revokedCount: data.revokedCount || 0,
    });
  } catch (err) {
    console.error("[Sessions] Failed to revoke all sessions:", err);
    return json({ error: "Failed to revoke sessions" }, { status: 500 });
  }
};
