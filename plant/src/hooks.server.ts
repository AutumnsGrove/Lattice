import type { Handle } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";

/**
 * Server hooks for the Plant app
 *
 * Handles CSRF origin checking for Cloudflare Pages custom domains.
 * SvelteKit's default CSRF check compares request origin with event.url.origin,
 * but on Cloudflare Pages with custom domains, these can mismatch.
 */

const ALLOWED_ORIGINS = [
  "https://plant.grove.place",
  "https://grove-plant.pages.dev",
];

export const handle: Handle = async ({ event, resolve }) => {
  // Custom CSRF check for form submissions
  if (event.request.method === "POST") {
    const origin = event.request.headers.get("origin");
    const contentType = event.request.headers.get("content-type");

    // Only check form submissions (not API calls with JSON)
    const isFormSubmission =
      contentType?.includes("application/x-www-form-urlencoded") ||
      contentType?.includes("multipart/form-data");

    if (isFormSubmission && origin) {
      const isAllowed =
        ALLOWED_ORIGINS.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");

      if (!isAllowed) {
        console.error(
          `[CSRF] Blocked form submission from disallowed origin: ${origin}`,
        );
        throw error(403, "Cross-site form submission blocked");
      }
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
    "img-src 'self' https://cdn.grove.place data:",
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https://*.grove.place https://api.lemonsqueezy.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
