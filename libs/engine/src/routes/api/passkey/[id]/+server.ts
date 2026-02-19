/**
 * Passkey Delete API
 *
 * DELETE /api/passkey/[id] - Delete a specific passkey
 *
 * This endpoint proxies to GroveAuth's passkey delete endpoint
 * via service binding (Worker-to-Worker, never public internet).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
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
  const passkeyId = params.id;
  if (!passkeyId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  // Collect all session cookies
  const groveSession = cookies.get("grove_session");
  const betterAuthSession =
    cookies.get("__Secure-better-auth.session_token") ||
    cookies.get("better-auth.session_token");

  if (!groveSession && !betterAuthSession) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.AUTH) {
    logGroveError("API", API_ERRORS.INTERNAL_ERROR, {
      detail: "AUTH service binding not available",
    });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }

  try {
    // Build Cookie header with all available session cookies
    const cookieParts: string[] = [];
    if (groveSession) {
      cookieParts.push(`grove_session=${groveSession}`);
    }
    if (betterAuthSession) {
      cookieParts.push(`better-auth.session_token=${betterAuthSession}`);
    }

    // Use service binding — Worker-to-Worker, never public internet
    const response = await platform.env.AUTH.fetch(
      `${AUTH_HUB_URL}/api/auth/passkey/delete-passkey`,
      {
        method: "POST",
        headers: {
          Cookie: cookieParts.join("; "),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passkeyId }),
      },
    );

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
