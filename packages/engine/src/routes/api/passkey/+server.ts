/**
 * Passkey List API
 *
 * GET /api/passkey
 *
 * Returns all passkeys for the authenticated user.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";

/** Default GroveAuth API URL */
const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate origin - this endpoint returns sensitive security data
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Get access token from cookie
  const accessToken = cookies.get("access_token");
  if (!accessToken) {
    throw error(401, "Not authenticated");
  }

  const authBaseUrl = platform?.env?.GROVEAUTH_URL || DEFAULT_AUTH_URL;

  try {
    // Fetch passkeys from GroveAuth
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/list-user-passkeys`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey] Failed to list passkeys:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      if (response.status === 401) {
        throw error(401, "Session expired. Please sign in again.");
      }

      throw error(
        response.status,
        errorData.message || errorData.error || "Failed to list passkeys",
      );
    }

    const passkeys = await response.json();
    return json(passkeys);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey] List error:", err);
    throw error(500, "Failed to list passkeys");
  }
};
