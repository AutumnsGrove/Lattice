/**
 * OAuth Callback - Handle Better Auth authentication response
 *
 * With Better Auth, the OAuth flow is handled entirely by GroveAuth.
 * This callback:
 * 1. Checks for OAuth errors from the provider
 * 2. Verifies the Better Auth session cookie exists
 * 3. Fetches session/user data from Better Auth
 * 4. Creates or updates the user_onboarding record
 * 5. Redirects to the right step (passkey setup, profile, plans, or blog admin)
 *
 * Error handling uses structured PLANT-XXX codes so failures are diagnosable.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PLANT_ERRORS, logPlantError, buildPlantErrorUrl } from "$lib/errors";
import { AUTH_HUB_URL } from "@autumnsgrove/groveengine/config";

/** Better Auth session cookie names (production uses __Secure- prefix) */
const BETTER_AUTH_COOKIE = "better-auth.session_token";
const BETTER_AUTH_COOKIE_SECURE = "__Secure-better-auth.session_token";

/**
 * Helper: redirect with a structured error.
 * Logs the error, then throws a SvelteKit redirect.
 */
function errorRedirect(
  error: (typeof PLANT_ERRORS)[keyof typeof PLANT_ERRORS],
  context: { path?: string; userId?: string; detail?: string; cause?: unknown },
  extra?: Record<string, string>,
): never {
  logPlantError(error, context);
  redirect(302, buildPlantErrorUrl(error, "/", extra));
}

/** Check if a thrown value is a SvelteKit redirect (must be re-thrown). */
function isRedirect(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number" &&
    (err as { status: number }).status >= 300 &&
    (err as { status: number }).status < 400
  );
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const env = platform?.env as Record<string, string> | undefined;
  const authBaseUrl = env?.GROVEAUTH_URL || AUTH_HUB_URL;
  const db = platform?.env?.DB;
  const path = url.pathname;

  // ─── Check for error from OAuth provider ─────────────────────────────
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    if (errorParam === "access_denied") {
      errorRedirect(PLANT_ERRORS.OAUTH_ACCESS_DENIED, {
        path,
        detail: `OAuth error: ${errorParam}`,
      });
    }
    errorRedirect(PLANT_ERRORS.OAUTH_PROVIDER_ERROR, {
      path,
      detail: `OAuth error: ${errorParam}`,
    });
  }

  // ─── Pre-flight checks ──────────────────────────────────────────────
  if (!db) {
    errorRedirect(PLANT_ERRORS.DB_UNAVAILABLE, { path });
  }

  if (!platform?.env?.AUTH) {
    errorRedirect(PLANT_ERRORS.AUTH_BINDING_MISSING, { path });
  }

  // ─── Step 1: Verify Better Auth session cookie ──────────────────────
  const sessionToken =
    cookies.get(BETTER_AUTH_COOKIE_SECURE) || cookies.get(BETTER_AUTH_COOKIE);

  if (!sessionToken) {
    errorRedirect(PLANT_ERRORS.NO_SESSION_COOKIE, {
      path,
      detail: "No Better Auth session cookie found after OAuth callback",
    });
  }

  // ─── Step 2: Fetch session/user data from Better Auth ───────────────
  const allCookies = cookies.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  let sessionData: {
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

  try {
    const sessionResponse = await platform.env.AUTH.fetch(
      `${authBaseUrl}/api/auth/get-session`,
      {
        method: "GET",
        headers: { Cookie: cookieHeader },
      },
    );

    if (!sessionResponse.ok) {
      errorRedirect(PLANT_ERRORS.SESSION_FETCH_FAILED, {
        path,
        detail: `Status ${sessionResponse.status}`,
      });
    }

    sessionData = (await sessionResponse.json()) as typeof sessionData;
  } catch (err) {
    if (isRedirect(err)) throw err;

    errorRedirect(PLANT_ERRORS.SESSION_FETCH_FAILED, {
      path,
      detail: "Network or parse error fetching session",
      cause: err,
    });
  }

  if (!sessionData!.session || !sessionData!.user) {
    errorRedirect(PLANT_ERRORS.NO_SESSION_DATA, {
      path,
      detail: "Session response was 200 but missing session/user fields",
    });
  }

  const user = sessionData!.user!;
  const session = sessionData!.session!;
  console.log(
    `[Auth Callback] Session verified for user ${user.id.slice(0, 8)}...`,
  );

  // ─── Step 3: Check existing onboarding record ──────────────────────
  let existingOnboarding: {
    id: string;
    tenant_id: string | null;
    profile_completed_at: number | null;
  } | null = null;

  try {
    existingOnboarding = (await db
      .prepare(
        "SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
      )
      .bind(user.id)
      .first()) as {
      id: string;
      tenant_id: string | null;
      profile_completed_at: number | null;
    } | null;
  } catch (err) {
    errorRedirect(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
      path,
      userId: user.id,
      detail: "SELECT user_onboarding failed",
      cause: err,
    });
  }

  // ─── Step 4: Create or update onboarding record ────────────────────
  let onboardingId: string;
  let isNewUser = false;

  if (existingOnboarding) {
    onboardingId = existingOnboarding.id;
    const emailVerified = user.emailVerified === true;

    try {
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
    } catch (err) {
      errorRedirect(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
        path,
        userId: user.id,
        detail: `UPDATE user_onboarding id=${onboardingId}`,
        cause: err,
      });
    }

    // If they already have a tenant, redirect to their blog's arbor panel
    if (existingOnboarding.tenant_id) {
      try {
        const tenant = (await db
          .prepare("SELECT subdomain FROM tenants WHERE id = ?")
          .bind(existingOnboarding.tenant_id)
          .first()) as { subdomain: string } | null;

        if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
          redirect(302, `https://${tenant.subdomain}.grove.place/arbor`);
        }
      } catch (err) {
        if (isRedirect(err)) throw err;

        errorRedirect(PLANT_ERRORS.TENANT_QUERY_FAILED, {
          path,
          userId: user.id,
          detail: `SELECT tenants for id=${existingOnboarding.tenant_id}`,
          cause: err,
        });
      }
    }
  } else {
    // New user — create onboarding record
    onboardingId = crypto.randomUUID();
    isNewUser = true;
    const displayName = user.name || user.email.split("@")[0];
    const emailVerified = user.emailVerified === true;

    try {
      if (emailVerified) {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'oauth', unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, user.id, user.email, displayName)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`,
          )
          .bind(onboardingId, user.id, user.email, displayName)
          .run();
      }

      console.log("[Auth Callback] Created onboarding record:", onboardingId);
    } catch (err) {
      errorRedirect(PLANT_ERRORS.ONBOARDING_INSERT_FAILED, {
        path,
        userId: user.id,
        detail: `INSERT user_onboarding for ${user.email}`,
        cause: err,
      });
    }
  }

  // ─── Step 5: Set cookies ───────────────────────────────────────────
  try {
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    cookies.set("onboarding_id", onboardingId, cookieOptions);

    if (session.token) {
      cookies.set("access_token", session.token, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      });
    }
  } catch (err) {
    errorRedirect(PLANT_ERRORS.COOKIE_ERROR, {
      path,
      userId: user.id,
      cause: err,
    });
  }

  // ─── Step 6: Redirect to next step ────────────────────────────────
  const hasCompletedProfile = existingOnboarding?.profile_completed_at != null;

  // Clean up old PKCE cookies if they exist (from legacy flow)
  cookies.delete("auth_state", { path: "/" });
  cookies.delete("auth_code_verifier", { path: "/" });

  if (isNewUser) {
    redirect(302, "/auth/setup-passkey");
  } else if (!hasCompletedProfile) {
    redirect(302, "/profile");
  } else {
    redirect(302, "/plans");
  }
};
