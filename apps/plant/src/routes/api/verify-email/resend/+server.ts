/**
 * Resend Verification Code Endpoint
 *
 * POST: Request a new verification code
 * Rate limited to 3 requests per hour
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  createVerificationCode,
  getRateLimitStatus,
} from "$lib/server/email-verification";

export const POST: RequestHandler = async ({ cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");

  if (!onboardingId) {
    return json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  const kv = platform?.env?.KV;
  const env = platform?.env as Record<string, string> | undefined;
  const zephyrApiKey = env?.ZEPHYR_API_KEY;

  if (!db || !kv) {
    return json(
      { success: false, error: "Service unavailable" },
      { status: 503 },
    );
  }

  if (!zephyrApiKey) {
    console.error("[Resend Code] ZEPHYR_API_KEY not configured");
    return json(
      { success: false, error: "Email service unavailable" },
      { status: 503 },
    );
  }

  // Get user info
  const user = await db
    .prepare(
      `SELECT email, display_name, email_verified
       FROM user_onboarding
       WHERE id = ?`,
    )
    .bind(onboardingId)
    .first();

  if (!user) {
    return json({ success: false, error: "User not found" }, { status: 404 });
  }

  // Check if already verified
  if (user.email_verified === 1) {
    return json(
      { success: false, error: "Email already verified" },
      { status: 400 },
    );
  }

  // Create and send new code
  const result = await createVerificationCode(
    db,
    kv,
    onboardingId,
    user.email as string,
    user.display_name as string | null,
    zephyrApiKey,
    env?.ZEPHYR_URL,
  );

  if (!result.success) {
    const status = result.errorCode === "rate_limited" ? 429 : 500;
    return json(
      {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        retryAfterSeconds: result.retryAfterSeconds,
      },
      { status },
    );
  }

  return json({ success: true });
};

/**
 * GET: Check rate limit status
 */
export const GET: RequestHandler = async ({ cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");

  if (!onboardingId) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  const kv = platform?.env?.KV;

  if (!kv) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const status = await getRateLimitStatus(kv, onboardingId);

  return json(status);
};
