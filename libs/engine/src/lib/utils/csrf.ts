/**
 * CSRF Protection Utilities
 *
 * Three layers of CSRF defense:
 * 1. Origin-based validation (validateCSRF) — checks Origin header matches host
 * 2. Token-based validation (validateCSRFToken) — checks x-csrf-token header
 * 3. Session-bound HMAC tokens (generateSessionCSRFToken) — ties token to session
 *
 * When Origin header is absent, falls back to requiring a valid CSRF token
 * instead of passing (fail-closed behavior).
 */

/**
 * Generate cryptographically secure CSRF token (for unauthenticated users)
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

/**
 * Generate a session-bound CSRF token using HMAC-SHA256.
 * Ties the CSRF token to the user's session, preventing cross-session reuse.
 *
 * For authenticated users: token = HMAC(sessionValue, secret)
 * For unauthenticated users: use generateCSRFToken() instead
 */
export async function generateSessionCSRFToken(
  sessionValue: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sessionValue),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a session-bound CSRF token by recomputing the HMAC.
 */
export async function validateSessionCSRFToken(
  token: string,
  sessionValue: string,
  secret: string,
): Promise<boolean> {
  if (!token || !sessionValue || !secret) return false;

  const expected = await generateSessionCSRFToken(sessionValue, secret);

  // Constant-length comparison — both are hex strings of same HMAC output
  if (token.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares all characters regardless of match (no early exit).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate CSRF token from request against session token
 */
export function validateCSRFToken(
  request: Request,
  sessionToken: string,
): boolean {
  if (!sessionToken) return false;

  const headerToken = request.headers.get("x-csrf-token");
  const bodyToken = request.headers.get("csrf-token"); // fallback

  if (!headerToken && !bodyToken) return false;

  return (
    (headerToken !== null && timingSafeEqual(headerToken, sessionToken)) ||
    (bodyToken !== null && timingSafeEqual(bodyToken, sessionToken))
  );
}

/**
 * Options for validateCSRF when Origin header is absent
 */
interface ValidateCSRFOptions {
  /** CSRF token from request header, used as fallback when Origin is absent */
  csrfToken?: string | null;
  /** Expected CSRF token (from cookie), used as fallback when Origin is absent */
  expectedToken?: string | null;
}

/**
 * Validate CSRF via origin matching, with token fallback when Origin is absent.
 *
 * SECURITY: When no Origin header is present, requires a valid CSRF token
 * instead of passing. This prevents CSRF bypass via requests that strip Origin.
 */
export function validateCSRF(
  request: Request,
  debug?: boolean,
  options?: ValidateCSRFOptions,
): boolean {
  // Handle edge cases
  if (!request || typeof request !== "object") {
    if (debug) console.log("[validateCSRF] Invalid request object");
    return false;
  }

  if (!request.headers || typeof request.headers.get !== "function") {
    if (debug) console.log("[validateCSRF] Invalid headers");
    return false;
  }

  const origin = request.headers.get("origin");
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (debug) {
    console.log("[validateCSRF] Checking:", { origin, host });
  }

  // When Origin is present, validate it matches the host (existing logic)
  if (origin) {
    try {
      const originUrl = new URL(origin);

      // Validate protocol (must be http or https)
      if (!["http:", "https:"].includes(originUrl.protocol)) {
        if (debug) console.log("[validateCSRF] Invalid protocol");
        return false;
      }

      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";

      // Require HTTPS for non-localhost
      if (!isLocalhost && originUrl.protocol !== "https:") {
        if (debug) console.log("[validateCSRF] Non-HTTPS for non-localhost");
        return false;
      }

      // STRICT: Require exact origin match (same-origin policy)
      // This prevents cross-tenant CSRF attacks where tenant1.grove.place
      // could make requests to tenant2.grove.place
      // Use origin's protocol to construct host URL (host header has no protocol)
      const hostUrl = host ? new URL(`${originUrl.protocol}//${host}`) : null;
      const isSameHost = hostUrl && originUrl.hostname === hostUrl.hostname;

      // Check port match - same-origin policy requires protocol + host + port
      // Default ports: 443 for https, 80 for http (empty string in URL.port)
      const defaultPort = originUrl.protocol === "https:" ? "443" : "80";
      const originPort = originUrl.port || defaultPort;
      const hostPort = hostUrl?.port || defaultPort;
      const isSamePort = originPort === hostPort;

      if (debug) {
        console.log("[validateCSRF] Host comparison:", {
          originHostname: originUrl.hostname,
          hostHostname: hostUrl?.hostname,
          isSameHost,
          originPort,
          hostPort,
          isSamePort,
        });
      }

      // Only allow same-host AND same-port, or localhost
      if (!isLocalhost && (!isSameHost || !isSamePort)) {
        if (debug) console.log("[validateCSRF] Host/port mismatch - REJECTING");
        return false;
      }
    } catch (e) {
      if (debug) console.log("[validateCSRF] Error:", e);
      return false;
    }

    // Origin present and valid
    if (debug) console.log("[validateCSRF] PASSED (origin match)");
    return true;
  }

  // SECURITY: Origin header is absent — fall back to CSRF token validation
  // This prevents bypass via requests that strip the Origin header
  if (options?.csrfToken && options?.expectedToken) {
    const tokenValid = timingSafeEqual(
      options.csrfToken,
      options.expectedToken,
    );
    if (debug)
      console.log("[validateCSRF] No origin, token fallback:", { tokenValid });
    return tokenValid;
  }

  // No Origin and no CSRF token — fail closed
  if (debug)
    console.log("[validateCSRF] No origin and no token fallback - REJECTING");
  return false;
}
