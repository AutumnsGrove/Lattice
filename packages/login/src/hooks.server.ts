import type { Handle } from "@sveltejs/kit";

/**
 * Server hooks for the Login app
 *
 * Security headers are set here. CSRF protection is handled by SvelteKit's
 * built-in csrf.checkOrigin (configured in svelte.config.js trustedOrigins).
 * CSP with nonces is handled by SvelteKit's kit.csp config.
 *
 * Lightweight — no session resolution (login doesn't have a DB binding).
 * Session presence is checked per-route where needed.
 *
 * Rate limiting: Not implemented at the proxy layer. Handled by Heartwood's
 * D1-based rate limiters + Better Auth's built-in rate limiting (enabled),
 * with Cloudflare WAF rules recommended as an additional layer.
 * See HAWK-001 in docs/security/hawk-report-2026-02-10-login-auth-hub.md
 */

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Security headers (CSP is handled by SvelteKit's kit.csp config with nonces)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  return response;
};
