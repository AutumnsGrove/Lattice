/**
 * Auth Callback - Handle session validation after Better Auth login
 *
 * This route is called after LoginGraft completes OAuth.
 * Better Auth has already set the grove_session cookie.
 * We validate the session, sync user data to Plant's database,
 * and redirect to the appropriate onboarding step.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  session_missing: "Login session not found, please try again",
  session_invalid: "Login session expired, please try again",
  userinfo_failed: "Unable to fetch your profile, please try again",
  server_error: "Authentication service unavailable, please try later",
};

function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  isAdmin: boolean;
}

interface SessionValidateResponse {
  valid: boolean;
  user?: SessionUser;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const errorParam = url.searchParams.get("error");

  // Check for error from OAuth provider
  if (errorParam) {
    console.error("[Auth Callback] Error from OAuth:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(errorParam);
    redirect(302, `/?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Get grove_session cookie (set by Better Auth during OAuth)
  const groveSession = cookies.get("grove_session");

  if (!groveSession) {
    console.error("[Auth Callback] No grove_session cookie found");
    redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("session_missing"))}`,
    );
  }

  const env = platform?.env as Record<string, string> | undefined;
  const db = platform?.env?.DB;
  const authService = platform?.env?.AUTH;

  if (!db) {
    console.error("[Auth Callback] Database not available");
    redirect(
      302,
      `/?error=${encodeURIComponent("Service temporarily unavailable")}`,
    );
  }

  if (!authService) {
    console.error("[Auth Callback] AUTH service binding not available");
    redirect(
      302,
      `/?error=${encodeURIComponent("Service temporarily unavailable")}`,
    );
  }

  try {
    // Validate session via GroveAuth service binding
    const authBaseUrl = env?.GROVEAUTH_URL || "https://auth-api.grove.place";
    const response = await authService.fetch(
      `${authBaseUrl}/session/validate`,
      {
        method: "POST",
        headers: { Cookie: `grove_session=${groveSession}` },
      },
    );

    if (!response.ok) {
      console.error(
        "[Auth Callback] Session validation failed:",
        response.status,
      );
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("session_invalid"))}`,
      );
    }

    const data = (await response.json()) as SessionValidateResponse;

    if (!data.valid || !data.user) {
      console.error("[Auth Callback] Session invalid or no user data");
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("session_invalid"))}`,
      );
    }

    const { user } = data;
    const groveauthId = user.id;
    const email = user.email;
    const name = user.name;
    // OAuth providers typically verify email, so we trust it
    const emailVerified = true;

    if (!groveauthId || !email) {
      console.error("[Auth Callback] Missing user info:", {
        groveauthId,
        email,
      });
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("userinfo_failed"))}`,
      );
    }

    // Check if user already has an onboarding record
    const existingOnboarding = await db
      .prepare(
        "SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
      )
      .bind(groveauthId)
      .first();

    let onboardingId: string;

    if (existingOnboarding) {
      // User already started onboarding
      onboardingId = existingOnboarding.id as string;

      // Update auth timestamp and auto-verify if OAuth provider confirms email
      if (emailVerified) {
        await db
          .prepare(
            `UPDATE user_onboarding
             SET auth_completed_at = unixepoch(),
                 email_verified = CASE WHEN email_verified = 0 THEN 1 ELSE email_verified END,
                 email_verified_at = CASE WHEN email_verified = 0 THEN unixepoch() ELSE email_verified_at END,
                 email_verified_via = CASE WHEN email_verified = 0 THEN 'oauth' ELSE email_verified_via END,
                 updated_at = unixepoch()
             WHERE id = ?`,
          )
          .bind(onboardingId)
          .run();
      } else {
        await db
          .prepare(
            "UPDATE user_onboarding SET auth_completed_at = unixepoch(), updated_at = unixepoch() WHERE id = ?",
          )
          .bind(onboardingId)
          .run();
      }

      // If they already have a tenant, redirect to their blog
      if (existingOnboarding.tenant_id) {
        // Get their subdomain
        const tenant = await db
          .prepare("SELECT subdomain FROM tenants WHERE id = ?")
          .bind(existingOnboarding.tenant_id)
          .first();

        if (tenant) {
          redirect(302, `https://${tenant.subdomain}.grove.place/admin`);
        }
      }
    } else {
      // Create new onboarding record
      onboardingId = crypto.randomUUID();

      // Include email_verified fields if OAuth provider confirms email
      if (emailVerified) {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'oauth', unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, groveauthId, email, name || null)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, groveauthId, email, name || null)
          .run();
      }
    }

    // Set onboarding ID cookie
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Store onboarding ID (grove_session is already set by Better Auth)
    cookies.set("onboarding_id", onboardingId, cookieOptions);

    // Redirect to profile page (or plans if profile already done)
    if (existingOnboarding?.profile_completed_at) {
      redirect(302, "/plans");
    } else {
      redirect(302, "/profile");
    }
  } catch (err) {
    // Re-throw redirects
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 302
    ) {
      throw err;
    }
    console.error("[Auth Callback] Error:", err);
    redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("server_error"))}`,
    );
  }
};
