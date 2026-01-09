/**
 * CSRF Protection Utilities
 * Validates requests come from same origin
 */

/**
 * Generate cryptographically secure CSRF token
 * @returns {string} UUID v4 token
 */
export function generateCSRFToken() {
  return crypto.randomUUID();
}

/**
 * Validate CSRF token from request against session token
 * @param {Request} request - The incoming request
 * @param {string} sessionToken - The token stored in the session
 * @returns {boolean}
 */
export function validateCSRFToken(request, sessionToken) {
  if (!sessionToken) return false;

  const headerToken = request.headers.get("x-csrf-token");
  const bodyToken = request.headers.get("csrf-token"); // fallback

  if (!headerToken && !bodyToken) return false;

  return headerToken === sessionToken || bodyToken === sessionToken;
}

/**
 * Validate CSRF token from request headers (origin-based fallback)
 * @param {Request} request
 * @returns {boolean}
 */
export function validateCSRF(request) {
  // Handle edge cases
  if (!request || typeof request !== "object") {
    return false;
  }

  if (!request.headers || typeof request.headers.get !== "function") {
    return false;
  }

  const origin = request.headers.get("origin");
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  // Allow same-origin requests
  if (origin) {
    try {
      const originUrl = new URL(origin);

      // Validate protocol (must be http or https)
      if (!["http:", "https:"].includes(originUrl.protocol)) {
        return false;
      }

      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";

      // Require HTTPS for non-localhost
      if (!isLocalhost && originUrl.protocol !== "https:") {
        return false;
      }

      // STRICT: Require exact hostname match (same-origin)
      // This prevents cross-tenant CSRF attacks where tenant1.grove.place
      // could make requests to tenant2.grove.place
      const hostUrl = host ? new URL(`https://${host}`) : null;
      const isSameHost = hostUrl && originUrl.hostname === hostUrl.hostname;

      // Only allow same-host or localhost
      if (!isLocalhost && !isSameHost) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
