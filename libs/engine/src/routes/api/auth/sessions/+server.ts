/**
 * GET /api/auth/sessions
 *
 * List all active sessions for the current user.
 * Proxies to GroveAuth's /session/list endpoint.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError } from "$lib/errors";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    return json({ sessions: [] }, { status: 401 });
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
      `${AUTH_HUB_URL}/session/list`,
      {
        method: "GET",
        headers: { Cookie: `grove_session=${groveSession}` },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      return json(
        {
          sessions: [],
          error: data.error || API_ERRORS.OPERATION_FAILED.userMessage,
          error_code: API_ERRORS.OPERATION_FAILED.code,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { sessions?: unknown[] };
    return json({ sessions: data.sessions || [] });
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
