/**
 * Email Verification Page Server
 *
 * Loads user info and sends initial verification code if needed.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  createVerificationCode,
  isEmailVerified,
  getRateLimitStatus,
} from "$lib/server/email-verification";

export const load: PageServerLoad = async ({ cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");
  const groveSession = cookies.get("grove_session");

  // Must be authenticated
  if (!onboardingId || !groveSession) {
    redirect(302, "/");
  }

  const db = platform?.env?.DB;
  const kv = platform?.env?.KV;
  const env = platform?.env as Record<string, string> | undefined;

  if (!db || !kv) {
    throw new Error("Service unavailable");
  }

  // Get user info
  const user = await db
    .prepare(
      `SELECT id, email, display_name, email_verified, profile_completed_at
       FROM user_onboarding
       WHERE id = ?`,
    )
    .bind(onboardingId)
    .first();

  if (!user) {
    // Invalid session
    cookies.delete("onboarding_id", { path: "/" });
    redirect(302, "/");
  }

  // If already verified, redirect to plans
  if (user.email_verified === 1) {
    redirect(302, "/plans");
  }

  // If profile not completed, redirect there first
  if (!user.profile_completed_at) {
    redirect(302, "/profile");
  }

  // Get rate limit status (isolated query - fallback to allowing resend on KV errors)
  let rateLimit: Awaited<ReturnType<typeof getRateLimitStatus>>;
  try {
    rateLimit = await getRateLimitStatus(kv, onboardingId);
  } catch (err) {
    console.error("[Verify Email] Failed to check rate limit status:", err);
    // Fallback: allow resend attempts (security trade-off: better UX vs potential abuse)
    rateLimit = { canResend: true, remainingResends: 3 };
  }

  // Check if there's an existing unexpired code
  const existingCode = await db
    .prepare(
      `SELECT id FROM email_verifications
       WHERE user_id = ?
         AND verified_at IS NULL
         AND expires_at > unixepoch()
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(onboardingId)
    .first();

  // If no existing code and can send, create one automatically
  let codeSent = !!existingCode;
  if (!existingCode && rateLimit.canResend) {
    const resendApiKey = env?.RESEND_API_KEY;
    if (resendApiKey) {
      const result = await createVerificationCode(
        db,
        kv,
        onboardingId,
        user.email as string,
        user.display_name as string | null,
        resendApiKey,
      );
      codeSent = result.success;

      // Refresh rate limit after sending
      const newRateLimit = await getRateLimitStatus(kv, onboardingId);
      return {
        email: user.email as string,
        displayName: user.display_name as string | null,
        codeSent,
        rateLimit: newRateLimit,
      };
    }
  }

  return {
    email: user.email as string,
    displayName: user.display_name as string | null,
    codeSent,
    rateLimit,
  };
};
