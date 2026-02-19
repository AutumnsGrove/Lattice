/**
 * Email Verification Service
 *
 * Handles generating, sending, and verifying email codes for the onboarding flow.
 * Uses D1 for code storage and KV for rate limiting.
 */

import { sendEmail } from "./send-email";
import { getVerificationEmail } from "./verification-email-template";

// Constants
const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_RATE_LIMIT = 3; // Max resends per hour
const RESEND_WINDOW_SECONDS = 3600; // 1 hour

export interface VerificationResult {
  success: boolean;
  error?: string;
  errorCode?: "invalid_code" | "expired" | "max_attempts" | "not_found";
}

export interface CreateCodeResult {
  success: boolean;
  error?: string;
  errorCode?: "rate_limited" | "db_error";
  retryAfterSeconds?: number;
}

/**
 * Generate a cryptographically secure 6-digit code
 */
function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Get a number between 0-999999 and pad with leading zeros
  const code = (array[0] % 1000000).toString().padStart(CODE_LENGTH, "0");
  return code;
}

// Basic email format validation regex
// Intentionally simple - we're not trying to validate all RFC 5322 edge cases
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Normalize email for consistent storage/lookup
 * Throws if email format is invalid
 */
export function normalizeEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (!isValidEmailFormat(normalized)) {
    throw new Error("Invalid email format");
  }
  return normalized;
}

/**
 * Check if user can request another verification code (rate limit)
 */
async function canResendCode(
  kv: KVNamespace,
  userId: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const key = `email_verify_resend:${userId}`;
  const data = await kv.get(key);

  if (!data) {
    return { allowed: true };
  }

  const { count, windowStart } = JSON.parse(data);
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = windowStart + RESEND_WINDOW_SECONDS;

  if (now >= windowEnd) {
    // Window expired, allow new requests
    return { allowed: true };
  }

  if (count >= RESEND_RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: windowEnd - now,
    };
  }

  return { allowed: true };
}

/**
 * Increment resend counter for rate limiting
 */
async function incrementResendCounter(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  const key = `email_verify_resend:${userId}`;
  const data = await kv.get(key);
  const now = Math.floor(Date.now() / 1000);

  let count = 1;
  let windowStart = now;

  if (data) {
    const parsed = JSON.parse(data);
    const windowEnd = parsed.windowStart + RESEND_WINDOW_SECONDS;

    if (now < windowEnd) {
      // Within same window
      count = parsed.count + 1;
      windowStart = parsed.windowStart;
    }
    // If window expired, start fresh (count=1, windowStart=now)
  }

  await kv.put(key, JSON.stringify({ count, windowStart }), {
    expirationTtl: RESEND_WINDOW_SECONDS,
  });
}

/**
 * Create and send a new verification code
 */
export async function createVerificationCode(
  db: D1Database,
  kv: KVNamespace,
  userId: string,
  email: string,
  displayName: string | null,
  zephyrApiKey: string,
  zephyrUrl?: string,
): Promise<CreateCodeResult> {
  const normalizedEmail = normalizeEmail(email);

  // Check rate limit
  const rateCheck = await canResendCode(kv, userId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${Math.ceil(rateCheck.retryAfterSeconds! / 60)} minutes.`,
      errorCode: "rate_limited",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }

  // Invalidate any existing codes for this user
  try {
    await db
      .prepare(
        `UPDATE email_verifications
         SET verified_at = -1
         WHERE user_id = ? AND verified_at IS NULL`,
      )
      .bind(userId)
      .run();
  } catch (err) {
    console.error("[Email Verification] Failed to invalidate old codes:", err);
    // Continue anyway - old codes will expire naturally
  }

  // Generate new code
  const code = generateCode();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CODE_EXPIRY_MINUTES * 60;

  // Store in database
  try {
    await db
      .prepare(
        `INSERT INTO email_verifications (id, user_id, email, code, created_at, expires_at, attempts)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
      )
      .bind(id, userId, normalizedEmail, code, now, expiresAt)
      .run();
  } catch (err) {
    console.error("[Email Verification] Failed to store code:", err);
    return {
      success: false,
      error: "Failed to create verification code. Please try again.",
      errorCode: "db_error",
    };
  }

  // Increment rate limit counter
  await incrementResendCounter(kv, userId);

  // Send email
  const emailContent = getVerificationEmail({
    name: displayName || "Wanderer",
    code,
    expiryMinutes: CODE_EXPIRY_MINUTES,
  });

  const emailResult = await sendEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    zephyrApiKey,
    zephyrUrl,
  });

  if (!emailResult.success) {
    console.error(
      "[Email Verification] Failed to send email:",
      emailResult.error,
    );
    // Don't fail the whole operation - code is created, user can request resend
  }

  return { success: true };
}

/**
 * Verify a code submitted by the user
 */
export async function verifyCode(
  db: D1Database,
  userId: string,
  submittedCode: string,
): Promise<VerificationResult> {
  const now = Math.floor(Date.now() / 1000);

  // Find the most recent valid code for this user
  const verification = await db
    .prepare(
      `SELECT id, code, expires_at, attempts
       FROM email_verifications
       WHERE user_id = ?
         AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first();

  if (!verification) {
    return {
      success: false,
      error: "No verification code found. Please request a new one.",
      errorCode: "not_found",
    };
  }

  // Check expiry
  if (now > (verification.expires_at as number)) {
    return {
      success: false,
      error: "Verification code has expired. Please request a new one.",
      errorCode: "expired",
    };
  }

  // Check max attempts
  if ((verification.attempts as number) >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: "Too many incorrect attempts. Please request a new code.",
      errorCode: "max_attempts",
    };
  }

  // Verify code
  if (verification.code !== submittedCode) {
    // Increment attempts
    await db
      .prepare(
        `UPDATE email_verifications
         SET attempts = attempts + 1
         WHERE id = ?`,
      )
      .bind(verification.id)
      .run();

    const remainingAttempts =
      MAX_ATTEMPTS - (verification.attempts as number) - 1;
    return {
      success: false,
      error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
      errorCode: "invalid_code",
    };
  }

  // Success! Mark code as used
  await db
    .prepare(
      `UPDATE email_verifications
       SET verified_at = ?
       WHERE id = ?`,
    )
    .bind(now, verification.id)
    .run();

  // Mark user as verified
  await db
    .prepare(
      `UPDATE user_onboarding
       SET email_verified = 1,
           email_verified_at = ?,
           email_verified_via = 'code',
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, userId)
    .run();

  return { success: true };
}

/**
 * Mark a user as verified via OAuth (trusted provider)
 */
export async function markVerifiedViaOAuth(
  db: D1Database,
  userId: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE user_onboarding
       SET email_verified = 1,
           email_verified_at = ?,
           email_verified_via = 'oauth',
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, userId)
    .run();
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`SELECT email_verified FROM user_onboarding WHERE id = ?`)
    .bind(userId)
    .first();

  return result?.email_verified === 1;
}

/**
 * Get rate limit status for display
 */
export async function getRateLimitStatus(
  kv: KVNamespace,
  userId: string,
): Promise<{
  canResend: boolean;
  remainingResends: number;
  retryAfterSeconds?: number;
}> {
  const key = `email_verify_resend:${userId}`;
  const data = await kv.get(key);

  if (!data) {
    return { canResend: true, remainingResends: RESEND_RATE_LIMIT };
  }

  const { count, windowStart } = JSON.parse(data);
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = windowStart + RESEND_WINDOW_SECONDS;

  if (now >= windowEnd) {
    return { canResend: true, remainingResends: RESEND_RATE_LIMIT };
  }

  const remaining = Math.max(0, RESEND_RATE_LIMIT - count);
  return {
    canResend: remaining > 0,
    remainingResends: remaining,
    retryAfterSeconds: remaining > 0 ? undefined : windowEnd - now,
  };
}
