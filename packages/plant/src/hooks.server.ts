import type { Handle } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";
import { validateCSRF } from "@autumnsgrove/groveengine/utils";

/**
 * Server hooks for the Plant app
 *
 * Handles CSRF origin checking for all state-changing requests.
 * Uses the shared validateCSRF() from the engine for proxy-aware origin validation.
 */

export const handle: Handle = async ({ event, resolve }) => {
  // CSRF validation for all state-changing methods (not just POST)
  if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
    if (!validateCSRF(event.request, true)) {
      console.error(
        `[CSRF] Blocked ${event.request.method} ${event.url.pathname}`,
        JSON.stringify({
          origin: event.request.headers.get("origin"),
          host: event.request.headers.get("host"),
          xForwardedHost: event.request.headers.get("x-forwarded-host"),
        }),
      );
      throw error(403, "Cross-site request blocked");
    }
  }

  const response = await resolve(event);

  // Security headers
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

  // CSP for plant (Lemon Squeezy uses redirect-based checkout, simpler CSP)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.grove.place data: blob:",
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https://*.grove.place https://api.lemonsqueezy.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
