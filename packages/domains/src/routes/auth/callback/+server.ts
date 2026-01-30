/**
 * OAuth Callback - Handle Better Auth authentication response
 *
 * With Better Auth, the OAuth flow is handled entirely by GroveAuth.
 * This callback:
 * 1. Verifies the Better Auth session cookie was set
 * 2. Fetches user info from Better Auth's session endpoint
 * 3. Creates/updates local user in D1 (domains has its own user management)
 * 4. Creates local session in D1
 * 5. Redirects to the requested destination
 *
 * NOTE: Domains keeps local D1 session storage because it needs local user
 * management for domain-specific features.
 */

import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSession, getOrCreateUser } from "$lib/server/db";

// =============================================================================
// Constants
// =============================================================================

const GROVEAUTH_API_URL = "https://auth-api.grove.place";

/** Better Auth session cookie name (set by GroveAuth) */
const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

// =============================================================================
// Error Messages
// =============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  auth_failed: "Authentication failed, please try again",
  no_session: "Session was not created, please try again",
  userinfo_failed: "Unable to retrieve your account information",
};

function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

// =============================================================================
// Handler
// =============================================================================

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  // Check for error from OAuth provider
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    console.error("[Auth Callback] Error from provider:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(
      errorParam === "access_denied" ? "access_denied" : "auth_failed",
    );
    redirect(302, `/admin/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Get return URL from query params (set by LoginGraft) or default to /admin
  const returnTo = url.searchParams.get("returnTo") || "/admin";

  // Verify Better Auth session cookie was set
  const sessionToken = cookies.get(BETTER_AUTH_SESSION_COOKIE);

  if (!sessionToken) {
    // No session cookie - check for legacy cookies during migration
    const legacySession = cookies.get("access_token") || cookies.get("session");
    if (!legacySession) {
      console.warn("[Auth Callback] No session cookie found");
      redirect(
        302,
        `/admin/login?error=${encodeURIComponent(getFriendlyErrorMessage("no_session"))}`,
      );
    }
    // Legacy session exists - allow through for now but log warning
    console.warn("[Auth Callback] Using legacy session cookie");
    redirect(302, returnTo);
  }

  // Fetch user info from Better Auth's session endpoint
  // This validates the session and gives us the user's email
  try {
    const sessionResponse = await fetch(
      `${GROVEAUTH_API_URL}/api/auth/session`,
      {
        headers: {
          Cookie: `${BETTER_AUTH_SESSION_COOKIE}=${sessionToken}`,
        },
      },
    );

    if (!sessionResponse.ok) {
      console.error(
        "[Auth Callback] Failed to get session:",
        sessionResponse.status,
      );
      redirect(
        302,
        `/admin/login?error=${encodeURIComponent(getFriendlyErrorMessage("auth_failed"))}`,
      );
    }

    const sessionData = (await sessionResponse.json()) as {
      user?: {
        email?: string;
        id?: string;
        name?: string;
      };
    };

    if (!sessionData.user?.email) {
      console.error("[Auth Callback] No user email in session response");
      redirect(
        302,
        `/admin/login?error=${encodeURIComponent(getFriendlyErrorMessage("userinfo_failed"))}`,
      );
    }

    const { DB } = platform.env;
    const userEmail = sessionData.user.email;

    // Create or get local user in domains D1 database
    const user = await getOrCreateUser(DB, userEmail);

    // Create local session in D1
    // Note: We don't store OAuth tokens anymore - Better Auth handles that
    const session = await createSession(DB, user.id);

    // Set local session cookie (domains uses its own session management)
    cookies.set("session", session.id, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log(
      "[Auth Callback] Success, user:",
      userEmail,
      "redirecting to:",
      returnTo,
    );
    redirect(302, returnTo);
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
      `/admin/login?error=${encodeURIComponent(getFriendlyErrorMessage("auth_failed"))}`,
    );
  }
};
