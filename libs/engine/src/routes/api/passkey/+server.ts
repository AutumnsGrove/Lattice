/**
 * Passkey List API
 *
 * GET /api/passkey
 *
 * Returns all passkeys for the authenticated user.
 * Uses service binding to reach Heartwood (Worker-to-Worker).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  API_ERRORS,
  throwGroveError,
  logGroveError,
} from "$lib/errors/index.js";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  // Collect session cookies (modern auth — no legacy access_token)
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
    // Build Cookie header with available session cookies
    const cookieParts: string[] = [];
    if (groveSession) {
      cookieParts.push(`grove_session=${groveSession}`);
    }
    if (betterAuthSession) {
      cookieParts.push(`better-auth.session_token=${betterAuthSession}`);
    }

    // Use service binding — Worker-to-Worker, never public internet
    const response = await platform.env.AUTH.fetch(
      `${AUTH_HUB_URL}/api/auth/passkey/list-user-passkeys`,
      {
        headers: {
          Cookie: cookieParts.join("; "),
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
