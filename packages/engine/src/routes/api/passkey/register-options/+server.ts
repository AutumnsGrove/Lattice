/**
 * Passkey Registration Options API
 *
 * POST /api/passkey/register-options
 *
 * Returns WebAuthn registration options for creating a new passkey.
 * The client uses these options to trigger the browser's WebAuthn ceremony.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";

/** GroveAuth API URL (not the frontend URL!) */
const AUTH_API_URL = "https://auth-api.grove.place";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate CSRF (origin-based for API endpoints)
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Support both grove_session (SessionDO) and access_token (legacy JWT)
  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throw error(401, "Not authenticated");
  }

  try {
    let response: Response;

    if (groveSession && platform?.env?.AUTH) {
      // Use service binding with grove_session (preferred for tenant subdomains)
      response = await platform.env.AUTH.fetch(
        `${AUTH_API_URL}/api/auth/passkey/generate-register-options`,
        {
          method: "POST",
          headers: {
            Cookie: `grove_session=${groveSession}`,
            "Content-Type": "application/json",
          },
        },
      );
    } else if (accessToken) {
      // Fallback to direct fetch with access_token (legacy JWT)
      response = await fetch(
        `${AUTH_API_URL}/api/auth/passkey/generate-register-options`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } else {
      throw error(401, "Not authenticated");
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey] Failed to get registration options:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      if (response.status === 401) {
        throw error(401, "Session expired. Please sign in again.");
      }

      throw error(
        response.status,
        errorData.message ||
          errorData.error ||
          "Failed to get passkey registration options",
      );
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey] Registration options error:", err);
    throw error(500, "Failed to get passkey registration options");
  }
};
