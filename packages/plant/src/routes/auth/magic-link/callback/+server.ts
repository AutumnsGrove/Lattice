/**
 * Magic Link Callback Handler
 *
 * GET /auth/magic-link/callback
 *
 * This is where users land after clicking the magic link in their email.
 * Better Auth has already verified the token and created a session.
 * We need to:
 * 1. Get the session/user info from Better Auth
 * 2. Create or update the onboarding record
 * 3. Redirect to passkey setup (for new users) or profile (for existing)
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/** Default GroveAuth API URL */
const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = env?.GROVEAUTH_URL || DEFAULT_AUTH_URL;
  const db = platform?.env?.DB;

  if (!db) {
    console.error("[Magic Link Callback] Database not available");
    redirect(302, "/?error=Service%20temporarily%20unavailable");
  }

  // Better Auth should have set session cookies when the magic link was clicked
  // We need to get the session info to know who the user is
  // Try to get session from Better Auth using any cookies that were set
  const allCookies = cookies.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    // Get session from Better Auth
    const sessionResponse = await fetch(`${authBaseUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!sessionResponse.ok) {
      console.error(
        "[Magic Link Callback] Failed to get session:",
        sessionResponse.status,
      );
      redirect(302, "/?error=Magic%20link%20expired%20or%20invalid");
    }

    const sessionData = (await sessionResponse.json()) as {
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: string;
      };
      user?: {
        id: string;
        email: string;
        name?: string;
        emailVerified?: boolean;
      };
    };

    if (!sessionData.session || !sessionData.user) {
      console.error("[Magic Link Callback] No session in response");
      redirect(302, "/?error=Magic%20link%20expired%20or%20invalid");
    }

    const { user } = sessionData;

    // Check if user already has an onboarding record
    const existingOnboarding = (await db
      .prepare(
        "SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
      )
      .bind(user.id)
      .first()) as {
      id: string;
      tenant_id: string | null;
      profile_completed_at: number | null;
    } | null;

    let onboardingId: string;
    let isNewUser = false;

    if (existingOnboarding) {
      // Existing user
      onboardingId = existingOnboarding.id;

      // Update auth timestamp and mark email as verified
      await db
        .prepare(
          `UPDATE user_onboarding
           SET auth_completed_at = unixepoch(),
               email_verified = 1,
               email_verified_at = CASE WHEN email_verified = 0 THEN unixepoch() ELSE email_verified_at END,
               email_verified_via = CASE WHEN email_verified = 0 THEN 'magic_link' ELSE email_verified_via END,
               updated_at = unixepoch()
           WHERE id = ?`,
        )
        .bind(onboardingId)
        .run();

      // If they have a tenant, redirect to their blog admin
      if (existingOnboarding.tenant_id) {
        const tenant = (await db
          .prepare("SELECT subdomain FROM tenants WHERE id = ?")
          .bind(existingOnboarding.tenant_id)
          .first()) as { subdomain: string } | null;

        if (tenant) {
          redirect(302, `https://${tenant.subdomain}.grove.place/arbor`);
        }
      }
    } else {
      // New user - create onboarding record
      onboardingId = crypto.randomUUID();
      isNewUser = true;
      const displayName = user.name || user.email.split("@")[0];

      await db
        .prepare(
          `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
           VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'magic_link', unixepoch(), unixepoch())`,
        )
        .bind(onboardingId, user.id, user.email, displayName)
        .run();

      console.log(
        "[Magic Link Callback] Created onboarding record:",
        onboardingId,
      );
    }

    // Set cookies
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Store onboarding ID
    cookies.set("onboarding_id", onboardingId, cookieOptions);

    // Store the Better Auth session token as access_token for our API calls
    if (sessionData.session.token) {
      cookies.set("access_token", sessionData.session.token, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      });
    }

    // For new users, redirect to passkey setup
    // For existing users without profile, redirect to profile
    // For existing users with profile, redirect to plans
    if (isNewUser) {
      redirect(302, "/auth/setup-passkey");
    } else if (!existingOnboarding?.profile_completed_at) {
      redirect(302, "/profile");
    } else {
      redirect(302, "/plans");
    }
  } catch (err) {
    // Re-throw redirects
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      (err as { status: number }).status >= 300 &&
      (err as { status: number }).status < 400
    ) {
      throw err;
    }

    console.error("[Magic Link Callback] Error:", err);
    redirect(302, "/?error=Something%20went%20wrong");
  }
};
