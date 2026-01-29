/**
 * Passkey Verify Registration API
 *
 * POST /api/passkey/verify-registration - Verify and complete passkey registration
 *
 * This endpoint proxies to GroveAuth's passkey verification endpoint,
 * completing the WebAuthn registration ceremony.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";

const AUTH_API_URL = "https://auth-api.grove.place";

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
    throw error(403, "Invalid origin");
  }

  const groveSession = cookies.get("grove_session");
  const accessToken = cookies.get("access_token");

  if (!groveSession && !accessToken) {
    throw error(401, "Not authenticated");
  }

  let body: VerifyRegistrationRequest;
  try {
    body = (await request.json()) as VerifyRegistrationRequest;
  } catch {
    throw error(400, "Invalid request body");
  }

  if (!body.credential || !body.credential.id || !body.credential.response) {
    throw error(400, "Invalid credential data");
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
        `${AUTH_API_URL}/api/auth/passkey/verify-registration`,
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
        `${AUTH_API_URL}/api/auth/passkey/verify-registration`,
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
      throw error(401, "Not authenticated");
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      console.error(
        "[Passkey Verify] GroveAuth error:",
        response.status,
        errorData,
      );
      throw error(
        response.status === 401 ? 401 : 500,
        errorData.message || "Failed to verify passkey registration",
      );
    }

    const passkey = await response.json();
    return json(passkey);
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("[Passkey Verify] Error:", err);
    throw error(500, "Failed to verify passkey registration");
  }
};
