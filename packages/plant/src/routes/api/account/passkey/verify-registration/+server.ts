/**
 * API: Verify passkey registration
 *
 * POST /api/account/passkey/verify-registration
 *
 * Verifies and registers a new passkey credential.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  isValidCredential,
  getRequiredEnv,
} from "@autumnsgrove/groveengine/heartwood";

/** Default auth URL for development. In production, set AUTH_BASE_URL env var. */
const DEFAULT_AUTH_URL = "https://heartwood.grove.place";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
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
    const body = await request.json();

    // Validate credential structure before forwarding
    if (!isValidCredential(body)) {
      return json(
        { error: "We couldn't process that passkey. Please try again" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/verify-registration`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      return json(
        { error: data.message || "Failed to register passkey" },
        { status: response.status },
      );
    }

    const passkey = await response.json();
    return json(passkey);
  } catch {
    return json({ error: "Unable to register passkey" }, { status: 500 });
  }
};
