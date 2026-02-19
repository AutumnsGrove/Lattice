/**
 * Email Verification API Endpoint
 *
 * POST: Verify a submitted code
 * GET: Check verification status
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { verifyCode, isEmailVerified } from "$lib/server/email-verification";

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");

  if (!onboardingId) {
    return json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json(
      { success: false, error: "Service unavailable" },
      { status: 503 },
    );
  }

  // Parse request body
  let code: string | undefined;
  try {
    const body = (await request.json()) as { code?: unknown };
    code = body.code?.toString().trim();
  } catch {
    return json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate code format
  if (!code || !/^\d{6}$/.test(code)) {
    return json(
      {
        success: false,
        error: "Please enter a valid 6-digit code",
        errorCode: "invalid_format",
      },
      { status: 400 },
    );
  }

  // Verify the code
  const result = await verifyCode(db, onboardingId, code);

  if (!result.success) {
    // Determine appropriate status code
    const status =
      result.errorCode === "not_found" || result.errorCode === "expired"
        ? 404
        : result.errorCode === "max_attempts"
          ? 429
          : 400;

    return json(
      {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status },
    );
  }

  return json({ success: true });
};

export const GET: RequestHandler = async ({ cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");

  if (!onboardingId) {
    return json(
      { verified: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json(
      { verified: false, error: "Service unavailable" },
      { status: 503 },
    );
  }

  const verified = await isEmailVerified(db, onboardingId);

  return json({ verified });
};
