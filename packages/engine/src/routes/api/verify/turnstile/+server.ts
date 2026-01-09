/**
 * Turnstile Verification Endpoint (Shade)
 *
 * POST /api/verify/turnstile
 *
 * Validates a Turnstile token and sets a verification cookie.
 * Cookie lasts 7 days, shared across all *.grove.place subdomains.
 */

import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  verifyTurnstileToken,
  createVerificationCookie,
  TURNSTILE_COOKIE_NAME,
} from "$lib/server/services/turnstile";

export const POST: RequestHandler = async ({ request, platform }) => {
  // Get the token from the request body
  let token: string;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    token = body.token as string;
  } catch {
    throw error(400, "Invalid request body");
  }

  if (!token) {
    throw error(400, "Missing Turnstile token");
  }

  // Get the secret key from environment
  const secretKey = (platform?.env as Record<string, unknown>)
    ?.TURNSTILE_SECRET_KEY as string | undefined;

  if (!secretKey) {
    console.error("Turnstile: TURNSTILE_SECRET_KEY not configured");
    throw error(500, "Verification service not configured");
  }

  // Get the user's IP for additional validation
  const remoteip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    undefined;

  // Verify the token with Cloudflare
  const result = await verifyTurnstileToken({
    token,
    secretKey,
    remoteip,
  });

  if (!result.success) {
    console.warn("Turnstile verification failed:", result["error-codes"]);
    throw error(403, "Human verification failed");
  }

  // Create the verification cookie
  const cookieValue = await createVerificationCookie(secretKey);

  // Build Set-Cookie header manually to ensure it's correct
  // Format: name=value; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place
  const cookieHeader = [
    `${TURNSTILE_COOKIE_NAME}=${cookieValue}`,
    "Path=/",
    "Max-Age=604800", // 7 days
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Domain=grove.place" // No leading dot - modern browsers handle this correctly
  ].join("; ");

  return new Response(JSON.stringify({
    success: true,
    message: "Verification successful",
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader
    }
  });
};
