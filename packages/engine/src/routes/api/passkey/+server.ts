/**
 * Passkey List API
 *
 * GET /api/passkey
 *
 * Returns all passkeys for the authenticated user.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  API_ERRORS,
  throwGroveError,
  logGroveError,
} from "$lib/errors/index.js";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate origin - this endpoint returns sensitive security data
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  // Get access token from cookie
  const accessToken = cookies.get("access_token");
  if (!accessToken) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  const authBaseUrl = platform?.env?.GROVEAUTH_URL || AUTH_HUB_URL;

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
        throwGroveError(401, API_ERRORS.SESSION_EXPIRED, "API");
      }

      logGroveError("API", API_ERRORS.UPSTREAM_ERROR, {
        detail: errorData.message || errorData.error,
      });
      throwGroveError(response.status, API_ERRORS.UPSTREAM_ERROR, "API");
    }

    const passkeys = await response.json();
    return json(passkeys);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};
