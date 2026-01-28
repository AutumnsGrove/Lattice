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
