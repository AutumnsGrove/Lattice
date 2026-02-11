/**
 * API: Get passkey registration options
 *
 * POST /api/account/passkey/register-options
 *
 * Returns WebAuthn options for registering a new passkey.
 * Uses the AUTH service binding (Worker-to-Worker) for reliable internal routing.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
import { AUTH_HUB_URL } from "@autumnsgrove/groveengine/config";

export const POST: RequestHandler = async ({ cookies, platform }) => {
  const accessToken = cookies.get("access_token");

  if (!accessToken) {
    return json(
      { error: "You'll need to sign in to register a passkey" },
      { status: 401 },
    );
  }

  if (!platform?.env?.AUTH) {
    logPlantError(PLANT_ERRORS.AUTH_BINDING_MISSING, {
      path: "/api/account/passkey/register-options",
    });
    return json({ error: "Auth service unavailable" }, { status: 503 });
  }

  const authBaseUrl = platform.env.GROVEAUTH_URL || AUTH_HUB_URL;

  // Forward all BA cookies so Better Auth can identify the session
  const allCookies = cookies.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    // Use AUTH service binding for internal Worker-to-Worker call
    const response = await platform.env.AUTH.fetch(
      `${authBaseUrl}/api/auth/passkey/generate-register-options`,
      {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      console.error(
        "[Passkey Register] Failed to get options:",
        response.status,
        data,
      );
      return json(
        { error: data.message || "Failed to get registration options" },
        { status: response.status },
      );
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    logPlantError(PLANT_ERRORS.INTERNAL_ERROR, {
      path: "/api/account/passkey/register-options",
      detail: "Failed to fetch passkey registration options from Heartwood",
      cause: err,
    });
    return json(
      { error: "Unable to get registration options" },
      { status: 500 },
    );
  }
};
