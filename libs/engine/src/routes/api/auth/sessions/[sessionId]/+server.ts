/**
 * DELETE /api/auth/sessions/:sessionId
 *
 * Revoke a specific session.
 * Proxies to GroveAuth's DELETE /session/:sessionId endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError } from "$lib/errors";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

export const DELETE: RequestHandler = async ({ params, cookies, platform }) => {
  const { sessionId } = params;
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    return json(
      {
        error: API_ERRORS.UNAUTHORIZED.userMessage,
        error_code: API_ERRORS.UNAUTHORIZED.code,
      },
      { status: 401 },
    );
  }

  if (!sessionId) {
    return json(
      {
        error: API_ERRORS.MISSING_REQUIRED_FIELDS.userMessage,
        error_code: API_ERRORS.MISSING_REQUIRED_FIELDS.code,
      },
      { status: 400 },
    );
  }

  // Validate sessionId format (UUID) to prevent path injection
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(sessionId)) {
    return json(
      {
        error: API_ERRORS.VALIDATION_FAILED.userMessage,
        error_code: API_ERRORS.VALIDATION_FAILED.code,
      },
      { status: 400 },
    );
  }

  if (!platform?.env?.AUTH) {
    logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE);
    return json(
      {
        error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
        error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
      },
      { status: 503 },
    );
  }

  try {
    const response = await platform.env.AUTH.fetch(
      `${AUTH_HUB_URL}/session/${sessionId}`,
      {
        method: "DELETE",
        headers: { Cookie: `grove_session=${groveSession}` },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return json(
        {
          error: data.error || API_ERRORS.OPERATION_FAILED.userMessage,
          error_code: API_ERRORS.OPERATION_FAILED.code,
        },
        { status: response.status },
      );
    }

    return json({ success: true });
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    return json(
      {
        error: API_ERRORS.OPERATION_FAILED.userMessage,
        error_code: API_ERRORS.OPERATION_FAILED.code,
      },
      { status: 500 },
    );
  }
};
