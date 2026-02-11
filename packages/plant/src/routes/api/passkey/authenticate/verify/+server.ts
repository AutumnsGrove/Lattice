/**
 * Passkey Authentication Verify API
 *
 * POST /api/passkey/authenticate/verify
 *
 * Verifies the WebAuthn assertion and creates a session.
 * This is the second step of passkey authentication:
 * 1. Client gets options from /options endpoint
 * 2. Browser performs WebAuthn ceremony
 * 3. Client sends assertion here for verification
 * 4. Server verifies, creates/updates onboarding record, sets session cookies
 *
 * Plant-specific: Works with user_onboarding table and redirects to /profile.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AUTH_HUB_URL } from "@autumnsgrove/groveengine/config";

interface VerifyRequestBody {
  credential: {
    id: string;
    rawId: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle: string | null;
    };
    type: string;
  };
  returnTo?: string;
}

interface GroveAuthVerifyResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
    emailVerified?: boolean;
  };
  error?: string;
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

export const POST: RequestHandler = async ({
  request,
  cookies,
  platform,
  url,
}) => {
  // Validate origin is from Grove platform
  if (!validateOrigin(request)) {
    console.warn(
      "[Passkey Verify] Invalid origin:",
      request.headers.get("origin"),
    );
    throw error(403, "Invalid origin");
  }

  // Parse request body
  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    throw error(400, "Invalid request body");
  }

  // Validate credential structure
  if (
    !body.credential ||
    !body.credential.id ||
    !body.credential.response ||
    !body.credential.response.authenticatorData ||
    !body.credential.response.clientDataJSON ||
    !body.credential.response.signature
  ) {
    throw error(400, "Invalid credential data");
  }

  // Get returnTo from request body or cookie (default to /profile for Plant onboarding)
  const returnTo =
    body.returnTo || cookies.get("passkey_return_to") || "/profile";

  // Clear the returnTo cookie
  cookies.delete("passkey_return_to", { path: "/" });

  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = env?.GROVEAUTH_URL || AUTH_HUB_URL;
  const db = platform?.env?.DB;

  if (!db) {
    console.error("[Passkey Verify] Database not available");
    throw error(500, "Service temporarily unavailable");
  }

  try {
    // Send assertion to GroveAuth for verification
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/verify-authentication`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: body.credential,
        }),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey Verify] GroveAuth verification failed:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      // Map specific errors to user-friendly messages
      const errorMessage =
        errorData.message || errorData.error || "Passkey verification failed";

      if (response.status === 404) {
        throw error(
          401,
          "No passkey found for this account. Try signing in with Google instead.",
        );
      }

      throw error(response.status, errorMessage);
    }

    const result = (await response.json()) as GroveAuthVerifyResponse;

    if (!result.verified || !result.accessToken) {
      throw error(401, result.error || "Passkey verification failed");
    }

    if (!result.user) {
      throw error(401, "Unable to retrieve user information");
    }

    // Check if user already has an onboarding record
    const existingOnboarding = (await db
      .prepare(
        "SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
      )
      .bind(result.user.id)
      .first()) as {
      id: string;
      tenant_id: string | null;
      profile_completed_at: number | null;
    } | null;

    let onboardingId: string;
    let redirectTo = returnTo;

    if (existingOnboarding) {
      // User already started onboarding
      onboardingId = existingOnboarding.id;

      // Update auth timestamp
      await db
        .prepare(
          "UPDATE user_onboarding SET auth_completed_at = unixepoch(), updated_at = unixepoch() WHERE id = ?",
        )
        .bind(onboardingId)
        .run();

      // If they already have a tenant, redirect to their blog admin
      if (existingOnboarding.tenant_id) {
        const tenant = (await db
          .prepare("SELECT subdomain FROM tenants WHERE id = ?")
          .bind(existingOnboarding.tenant_id)
          .first()) as { subdomain: string } | null;

        if (tenant) {
          redirectTo = `https://${tenant.subdomain}.grove.place/arbor`;
        }
      } else if (existingOnboarding.profile_completed_at) {
        // Profile done, go to plans
        redirectTo = "/plans";
      }
    } else {
      // Create new onboarding record
      onboardingId = crypto.randomUUID();
      const displayName = result.user.name || result.user.email.split("@")[0];

      // If GroveAuth confirms email is verified (e.g., from previous OAuth), mark it
      if (result.user.emailVerified) {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'passkey', unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, result.user.id, result.user.email, displayName)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, result.user.id, result.user.email, displayName)
          .run();
      }

      console.log("[Passkey Verify] Created onboarding record:", onboardingId);
    }

    // Determine production environment
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    // Set session cookies (Plant-specific - no cross-domain cookies)
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Store onboarding ID
    cookies.set("onboarding_id", onboardingId, cookieOptions);

    // Store access token
    cookies.set("access_token", result.accessToken, {
      ...cookieOptions,
      maxAge: result.expiresIn || 3600,
    });

    // Store refresh token if provided
    if (result.refreshToken) {
      cookies.set("refresh_token", result.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    console.log(
      "[Passkey Verify] Authentication successful for:",
      onboardingId,
    );

    return json({
      success: true,
      redirectTo,
    });
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey Verify] Error:", err);
    throw error(500, "Failed to verify passkey authentication");
  }
};
