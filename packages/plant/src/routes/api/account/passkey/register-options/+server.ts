/**
 * API: Get passkey registration options
 *
 * POST /api/account/passkey/register-options
 *
 * Returns WebAuthn options for registering a new passkey.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getRequiredEnv } from "@autumnsgrove/groveengine/heartwood";

/** Default auth URL for development. In production, set AUTH_BASE_URL env var. */
const DEFAULT_AUTH_URL = "https://heartwood.grove.place";

export const POST: RequestHandler = async ({ cookies, platform }) => {
  const accessToken = cookies.get("access_token");

  if (!accessToken) {
    return json(
      { error: "You'll need to sign in to register a passkey" },
      { status: 401 },
    );
  }

  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = getRequiredEnv(env, "AUTH_BASE_URL", DEFAULT_AUTH_URL);

  try {
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/generate-register-options`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      return json(
        { error: data.message || "Failed to get registration options" },
        { status: response.status },
      );
    }

    const options = await response.json();
    return json(options);
  } catch {
    return json(
      { error: "Unable to get registration options" },
      { status: 500 },
    );
  }
};
