/**
 * POST /api/auth/sessions/revoke-all
 *
 * Revoke all sessions except optionally the current one.
 * Proxies to GroveAuth's POST /session/revoke-all endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError } from "$lib/errors";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
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

  let keepCurrent = true;
  try {
    const body = (await request.json()) as { keepCurrent?: boolean };
    keepCurrent = body.keepCurrent ?? true;
  } catch {
    // Default to keeping current session
  }

  try {
    const response = await platform.env.AUTH.fetch(
      `${AUTH_HUB_URL}/session/revoke-all`,
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
        {
          error: data.error || API_ERRORS.OPERATION_FAILED.userMessage,
          error_code: API_ERRORS.OPERATION_FAILED.code,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { revokedCount?: number };
    return json({
      success: true,
      revokedCount: data.revokedCount || 0,
    });
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
