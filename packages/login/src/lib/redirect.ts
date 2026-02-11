/**
 * Redirect URL Validation
 *
 * Ensures redirect URLs are safe — only *.grove.place domains allowed.
 * Prevents open redirect vulnerabilities where an attacker could craft
 * a login link that redirects to a malicious site after auth.
 */

/** Default redirect when none specified or validation fails */
export const DEFAULT_REDIRECT = "https://plant.grove.place/auth/callback";

/** Allowed redirect patterns */
const ALLOWED_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)?grove\.place(\/|$)/i,
  /^https:\/\/autumnsgrove\.com(\/|$)/i,
];

/** Also allow localhost in development */
const DEV_PATTERNS = [
  /^http:\/\/localhost(:\d+)?(\/|$)/,
  /^http:\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

/**
 * Validate and sanitize a redirect URL.
 * Returns the URL if safe, or the default redirect if not.
 */
export function validateRedirectUrl(
  url: string | null | undefined,
  isDev = false,
): string {
  if (!url) return DEFAULT_REDIRECT;

  // Block dangerous URI schemes immediately
  const lower = url.toLowerCase().trim();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("//")
  ) {
    return DEFAULT_REDIRECT;
  }

  // Relative URLs are safe (same-origin)
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    // Must be a valid absolute URL with http(s) scheme
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return DEFAULT_REDIRECT;
    }

    // Check against allowed production patterns
    for (const pattern of ALLOWED_PATTERNS) {
      if (pattern.test(url)) return url;
    }

    // In dev, also allow localhost
    if (isDev) {
      for (const pattern of DEV_PATTERNS) {
        if (pattern.test(url)) return url;
      }
    }

    console.warn("[Redirect] Blocked unsafe redirect URL");
    return DEFAULT_REDIRECT;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
