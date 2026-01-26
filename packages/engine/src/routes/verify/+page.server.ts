/**
 * Verification Page Server
 *
 * Checks if user is already verified and redirects if so.
 * Provides the Turnstile site key to the page.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  TURNSTILE_COOKIE_NAME,
  validateVerificationCookie,
} from "$lib/server/services/turnstile";
import { getRealOrigin } from "$lib/server/origin";

/**
 * Validates if a redirect target is safe (relative path or same-origin URL).
 * Prevents open redirect attacks to external or malicious URLs.
 */
function isValidRedirect(target: string, origin: string): boolean {
  // Allow relative paths starting with / but not //
  if (target.startsWith("/") && !target.startsWith("//")) {
    return true;
  }

  // Allow same-origin absolute URLs
  try {
    const targetUrl = new URL(target, origin);
    return targetUrl.origin === origin;
  } catch {
    return false;
  }
}

export const load: PageServerLoad = async ({ cookies, platform, url, request }) => {
  const secretKey = platform?.env?.TURNSTILE_SECRET_KEY;
  const siteKey = platform?.env?.TURNSTILE_SITE_KEY;

  // Get the real origin (respects X-Forwarded-Host from grove-router proxy)
  const realOrigin = getRealOrigin(request, url);

  // Check if already verified
  const existingCookie = cookies.get(TURNSTILE_COOKIE_NAME);
  if (
    existingCookie &&
    secretKey &&
    (await validateVerificationCookie(existingCookie, secretKey))
  ) {
    // Already verified, redirect to intended destination or home
    const returnTo = url.searchParams.get("return") || "/";
    const safeRedirect = isValidRedirect(returnTo, realOrigin) ? returnTo : "/";
    throw redirect(302, safeRedirect);
  }

  // Get return URL for after verification
  const returnTo = url.searchParams.get("return") || "/";
  const safeReturnTo = isValidRedirect(returnTo, realOrigin) ? returnTo : "/";

  return {
    siteKey: siteKey || "",
    returnTo: safeReturnTo,
  };
};
