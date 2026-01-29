/**
 * Passkey Delete API
 *
 * DELETE /api/passkey/[id] - Delete a specific passkey
 *
 * This endpoint proxies to GroveAuth's passkey delete endpoint.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";

const AUTH_API_URL = "https://auth-api.grove.place";

/**
 * DELETE /api/passkey/[id] - Delete a passkey
 */
export const DELETE: RequestHandler = async ({
  params,
  request,
  cookies,
  platform,
}) => {
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  const passkeyId = params.id;
  if (!passkeyId) {
    throw error(400, "Passkey ID is required");
  }

  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throw error(401, "Not authenticated");
  }

  try {
    let response: Response;
    const requestBody = JSON.stringify({ passkeyId });

    if (groveSession && platform?.env?.AUTH) {
      // Use service binding with grove_session
      response = await platform.env.AUTH.fetch(
        `${AUTH_API_URL}/api/auth/passkey/delete-passkey`,
        {
          method: "POST",
          headers: {
            Cookie: `grove_session=${groveSession}`,
            "Content-Type": "application/json",
          },
          body: requestBody,
        },
      );
    } else if (accessToken) {
      // Fallback to direct fetch with access_token
      response = await fetch(
        `${AUTH_API_URL}/api/auth/passkey/delete-passkey`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: requestBody,
        },
      );
    } else {
      throw error(401, "Not authenticated");
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      console.error(
        "[Passkey Delete] GroveAuth error:",
        response.status,
        errorData,
      );
      throw error(
        response.status === 401 ? 401 : response.status === 404 ? 404 : 500,
        errorData.message || "Failed to delete passkey",
      );
    }

    return json({ success: true });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Passkey Delete] Error:", err);
    throw error(500, "Failed to delete passkey");
  }
};
