/**
 * API: Verify passkey registration
 *
 * POST /api/account/passkey/verify-registration
 *
 * Verifies and registers a new passkey credential.
 * Uses the AUTH service binding (Worker-to-Worker) for reliable internal routing.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isValidCredential } from "@autumnsgrove/groveengine/heartwood";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
import { AUTH_HUB_URL } from "@autumnsgrove/groveengine/config";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const accessToken = cookies.get("access_token");

  if (!accessToken) {
    return json(
      { error: "You'll need to sign in to register a passkey" },
      { status: 401 },
    );
  }

  if (!platform?.env?.AUTH) {
    logPlantError(PLANT_ERRORS.AUTH_BINDING_MISSING, {
      path: "/api/account/passkey/verify-registration",
    });
    return json({ error: "Auth service unavailable" }, { status: 503 });
  }

  const authBaseUrl = platform.env.GROVEAUTH_URL || AUTH_HUB_URL;

  // Forward all BA cookies so Better Auth can identify the session
  const allCookies = cookies.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    const body = await request.json();

    // Validate credential structure before forwarding
    if (!isValidCredential(body)) {
      return json(
        { error: "We couldn't process that passkey. Please try again" },
        { status: 400 },
      );
    }

    // Use AUTH service binding for internal Worker-to-Worker call
    const response = await platform.env.AUTH.fetch(
      `${authBaseUrl}/api/auth/passkey/verify-registration`,
      {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      console.error(
        "[Passkey Verify] Failed to verify registration:",
        response.status,
        data,
      );
      return json(
        { error: data.message || "Failed to register passkey" },
        { status: response.status },
      );
    }

    const passkey = await response.json();
    return json(passkey);
  } catch (err) {
    logPlantError(PLANT_ERRORS.INTERNAL_ERROR, {
      path: "/api/account/passkey/verify-registration",
      detail: "Failed to verify passkey registration with Heartwood",
      cause: err,
    });
    return json({ error: "Unable to register passkey" }, { status: 500 });
  }
};
