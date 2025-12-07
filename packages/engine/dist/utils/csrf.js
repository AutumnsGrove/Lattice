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
  const host = request.headers.get("host");

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

      const hostMatches = host && originUrl.host === host;

      if (!isLocalhost && !hostMatches) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
