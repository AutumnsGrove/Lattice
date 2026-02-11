/**
 * Passkey Delete API
 *
 * DELETE /api/passkey/[id] - Delete a specific passkey
 *
 * This endpoint proxies to GroveAuth's passkey delete endpoint.
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
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  const passkeyId = params.id;
  if (!passkeyId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  try {
    let response: Response;
    const requestBody = JSON.stringify({ passkeyId });

    if (groveSession && platform?.env?.AUTH) {
      // Use service binding with grove_session
      response = await platform.env.AUTH.fetch(
        `${AUTH_HUB_URL}/api/auth/passkey/delete-passkey`,
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
        `${AUTH_HUB_URL}/api/auth/passkey/delete-passkey`,
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
      throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      logGroveError("API", API_ERRORS.UPSTREAM_ERROR, {
        detail: errorData.message,
        status: response.status,
      });
      const errorToThrow =
        response.status === 401
          ? API_ERRORS.SESSION_EXPIRED
          : response.status === 404
            ? API_ERRORS.RESOURCE_NOT_FOUND
            : API_ERRORS.UPSTREAM_ERROR;
      throwGroveError(
        response.status === 401 ? 401 : response.status === 404 ? 404 : 500,
        errorToThrow,
        "API",
      );
    }

    return json({ success: true });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};
