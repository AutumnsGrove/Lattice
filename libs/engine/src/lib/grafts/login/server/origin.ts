/**
 * Origin Helper for Proxy Environments
 *
 * When requests come through grove-router (our Cloudflare Worker proxy),
 * the actual hostname is in X-Forwarded-Host while the internal Worker
 * hostname appears in the Host header and url.origin.
 *
 * Example:
 * - User visits: https://autumn.grove.place/admin
 * - grove-router proxies to: grove-lattice.pages.dev
 * - url.origin returns: https://grove-lattice.pages.dev (wrong for OAuth!)
 * - X-Forwarded-Host contains: autumn.grove.place (correct!)
 *
 * This helper ensures OAuth redirect_uri and other origin-dependent logic
 * uses the correct user-facing hostname.
 */

/**
 * Get the real origin, respecting X-Forwarded-Host from grove-router proxy.
 *
 * @param request - The incoming request (to read headers)
 * @param url - The parsed URL (to get protocol and fallback origin)
 * @returns The correct origin URL (e.g., "https://autumn.grove.place")
 *
 * @example
 * ```typescript
 * const redirectUri = `${getRealOrigin(request, url)}/auth/callback`;
 * // Returns "https://autumn.grove.place/auth/callback" even when
 * // the request was proxied through grove-router
 * ```
 */
export function getRealOrigin(request: Request, url: URL): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    // Always use HTTPS in production (grove-router only handles HTTPS)
    // Only use HTTP for localhost development
    const protocol = url.hostname === "localhost" ? "http:" : "https:";
    return `${protocol}//${forwardedHost}`;
  }
  return url.origin;
}

/**
 * Determine if the current request is in a production environment.
 *
 * @param url - The request URL
 * @returns true if not localhost
 */
export function isProduction(url: URL): boolean {
  return url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
}

/**
 * Determine if we're on the Grove platform (*.grove.place).
 *
 * Used to determine whether to set cross-subdomain cookies.
 *
 * @param url - The request URL
 * @returns true if hostname ends with grove.place
 */
export function isGrovePlatform(url: URL): boolean {
  return url.hostname.endsWith("grove.place");
}

/**
 * Get the cookie domain for cross-subdomain authentication.
 *
 * Returns ".grove.place" when in production on the Grove platform,
 * undefined otherwise (for localhost or non-Grove deployments).
 *
 * @param url - The request URL
 * @returns Cookie domain string or undefined
 */
export function getCookieDomain(url: URL): string | undefined {
  if (isProduction(url) && isGrovePlatform(url)) {
    return ".grove.place";
  }
  return undefined;
}
