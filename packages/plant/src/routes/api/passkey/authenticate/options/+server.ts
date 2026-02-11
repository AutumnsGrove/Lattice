/**
 * Passkey Authentication Options API
 *
 * POST /api/passkey/authenticate/options
 *
 * Returns WebAuthn authentication options for signing in with a passkey.
 * Uses discoverable credentials (empty allowCredentials) so the browser
 * shows all available passkeys for this domain.
 *
 * Note: Unlike registration, this endpoint doesn't require authentication -
 * anyone can request authentication options to sign in.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AUTH_HUB_URL } from "@autumnsgrove/groveengine/config";

interface RequestBody {
  returnTo?: string;
}

/**
 * Basic origin validation - ensures requests come from Grove or localhost
 */
function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Allow requests without origin header
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    // Allow grove.place subdomains and localhost for development
    return (
      originUrl.hostname.endsWith(".grove.place") ||
      originUrl.hostname === "grove.place" ||
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate origin is from Grove platform
  if (!validateOrigin(request)) {
    console.warn(
      "[Passkey Auth] Invalid origin:",
      request.headers.get("origin"),
    );
    throw error(403, "Invalid origin");
  }

  // Parse request body (optional returnTo)
  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    // Body is optional, continue with defaults
  }

  // Store returnTo in cookie for verification endpoint
  if (body.returnTo) {
    const isProduction =
      !request.url.includes("localhost") && !request.url.includes("127.0.0.1");

    cookies.set("passkey_return_to", body.returnTo, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });
  }

  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = env?.GROVEAUTH_URL || AUTH_HUB_URL;

  try {
    // Request authentication options from GroveAuth
    // This returns challenge, rpId, timeout - no allowCredentials for discoverable flow
    // NOTE: Better Auth uses GET for this endpoint, and the name is "authenticate" not "authentication"
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/generate-authenticate-options`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey Auth] Failed to get authentication options:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      throw error(
        response.status,
        errorData.message ||
          errorData.error ||
          "Failed to get passkey authentication options",
      );
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey Auth] Options error:", err);
    throw error(500, "Failed to get passkey authentication options");
  }
};
