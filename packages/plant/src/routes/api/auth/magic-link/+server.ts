/**
 * Magic Link API
 *
 * POST /api/auth/magic-link
 *
 * Sends a magic link email for passwordless signup/signin.
 * After clicking the link, users are directed to create a passkey.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/** Default GroveAuth API URL */
const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

interface MagicLinkRequest {
  email: string;
  /** Invite token to thread through the callback for expired-link recovery */
  inviteToken?: string;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: RequestHandler = async ({ request, url, platform }) => {
  let body: MagicLinkRequest;
  try {
    body = (await request.json()) as MagicLinkRequest;
  } catch {
    throw error(400, "Invalid request body");
  }

  const email = body.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    throw error(400, "Please enter a valid email address");
  }

  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = env?.GROVEAUTH_URL || DEFAULT_AUTH_URL;

  // Determine the callback URL - where users land after clicking the magic link
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  const appBaseUrl = isProduction
    ? env?.PUBLIC_APP_URL || "https://plant.grove.place"
    : `http://${url.host}`;

  // After magic link verification, redirect to passkey setup
  // Thread invite token through so expired links can redirect back to /invited
  const callbackParams = new URLSearchParams();
  if (body.inviteToken) {
    callbackParams.set("inviteToken", body.inviteToken);
  }
  const qs = callbackParams.toString();
  const callbackURL = `${appBaseUrl}/auth/magic-link/callback${qs ? `?${qs}` : ""}`;

  try {
    const response = await fetch(`${authBaseUrl}/api/auth/sign-in/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        callbackURL,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Magic Link] Failed to send:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      // Handle specific errors
      if (response.status === 429) {
        throw error(429, "Too many attempts. Please wait a few minutes.");
      }

      throw error(
        response.status,
        errorData.message || "Failed to send magic link",
      );
    }

    return json({ success: true });
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Magic Link] Error:", err);
    throw error(500, "Failed to send magic link. Please try again.");
  }
};
