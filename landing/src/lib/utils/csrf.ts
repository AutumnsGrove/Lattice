/**
 * CSRF Protection Utilities
 * Validates requests come from same origin using Origin or Referer header
 */

/**
 * Validate CSRF by checking origin/referer matches host
 *
 * Security: Requires either Origin or Referer header to be present and valid.
 * Requests without both headers are rejected to prevent CSRF attacks from
 * older browsers or crafted requests.
 */
export function validateCSRF(request: Request): boolean {
  // Handle edge cases
  if (!request || typeof request !== "object") {
    return false;
  }

  if (!request.headers || typeof request.headers.get !== "function") {
    return false;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  // SECURITY: Require at least one of Origin or Referer header
  // Reject requests without either to prevent CSRF from older browsers
  // or requests crafted without these headers
  if (!origin && !referer) {
    return false;
  }

  // Use Origin if present, otherwise fall back to Referer
  const sourceUrl = origin || referer;

  try {
    const parsedSource = new URL(sourceUrl!);

    // Validate protocol (must be http or https)
    if (!["http:", "https:"].includes(parsedSource.protocol)) {
      return false;
    }

    const isLocalhost =
      parsedSource.hostname === "localhost" ||
      parsedSource.hostname === "127.0.0.1";

    // Require HTTPS for non-localhost
    if (!isLocalhost && parsedSource.protocol !== "https:") {
      return false;
    }

    // STRICT: Require exact hostname match (same-origin)
    const hostUrl = host ? new URL(`https://${host}`) : null;
    const isSameHost = hostUrl && parsedSource.hostname === hostUrl.hostname;

    // Only allow same-host or localhost
    if (!isLocalhost && !isSameHost) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
