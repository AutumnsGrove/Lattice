/**
 * Passkey Registration Options API
 *
 * POST /api/passkey/register-options
 *
 * Returns WebAuthn registration options for creating a new passkey.
 * The client uses these options to trigger the browser's WebAuthn ceremony.
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

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate CSRF (origin-based for API endpoints)
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  // Support both grove_session (SessionDO) and access_token (legacy JWT)
  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  try {
    let response: Response;

    if (groveSession && platform?.env?.AUTH) {
      // Use service binding with grove_session (preferred for tenant subdomains)
      // Note: generate-register-options is a GET endpoint in Better Auth
      response = await platform.env.AUTH.fetch(
        `${AUTH_HUB_URL}/api/auth/passkey/generate-register-options`,
        {
          method: "GET",
          headers: {
            Cookie: `grove_session=${groveSession}`,
          },
        },
      );
    } else if (accessToken) {
      // Fallback to direct fetch with access_token (legacy JWT)
      response = await fetch(
        `${AUTH_HUB_URL}/api/auth/passkey/generate-register-options`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } else {
      throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
    }

    if (!response.ok) {
      const responseText = await response.text();
      let errorData: { message?: string; error?: string } = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        // Response wasn't JSON
      }

      logGroveError("API", API_ERRORS.UPSTREAM_ERROR, {
        detail: errorData.message || errorData.error,
        status: response.status,
      });

      if (response.status === 401) {
        throwGroveError(401, API_ERRORS.SESSION_EXPIRED, "API");
      }

      throwGroveError(response.status, API_ERRORS.UPSTREAM_ERROR, "API");
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};
