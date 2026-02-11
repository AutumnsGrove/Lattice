/**
 * Passkey Verify Registration API
 *
 * POST /api/passkey/verify-registration - Verify and complete passkey registration
 *
 * This endpoint proxies to GroveAuth's passkey verification endpoint,
 * completing the WebAuthn registration ceremony.
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

interface VerifyRegistrationRequest {
  credential: {
    id: string;
    rawId: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
    };
    type: string;
  };
  name?: string;
}

/**
 * POST /api/passkey/verify-registration - Verify credential and complete registration
 */
export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  let body: VerifyRegistrationRequest;
  try {
    body = (await request.json()) as VerifyRegistrationRequest;
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  if (!body.credential || !body.credential.id || !body.credential.response) {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  try {
    let response: Response;
    const requestBody = JSON.stringify({
      credential: body.credential,
      name: body.name,
    });

    if (groveSession && platform?.env?.AUTH) {
      // Use service binding with grove_session
      response = await platform.env.AUTH.fetch(
        `${AUTH_HUB_URL}/api/auth/passkey/verify-registration`,
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
        `${AUTH_HUB_URL}/api/auth/passkey/verify-registration`,
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
          : API_ERRORS.UPSTREAM_ERROR;
      throwGroveError(response.status === 401 ? 401 : 500, errorToThrow, "API");
    }

    const passkey = await response.json();
    return json(passkey);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};
