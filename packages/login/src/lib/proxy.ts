/**
 * Heartwood Proxy Utility — Shared by all proxy routes
 *
 * Extracted from api/auth/[...path]/+server.ts to enable proxying
 * additional Heartwood endpoints (/session/*, /userinfo) through
 * the login hub.
 *
 * Security hardening per docs/security/hawk-report-2026-02-10-login-auth-hub.md:
 * - Response header allowlist limits blast radius from Heartwood (HAWK-005)
 * - Request body size limit prevents resource abuse (HAWK-006)
 * - Cookie filtering sends only auth-related cookies (HAWK-007)
 */

import type { Cookies, RequestEvent } from "@sveltejs/kit";

const DEFAULT_AUTH_URL = "https://login.grove.place";

/** Max request body size for auth endpoints (1MB — generous for JSON payloads) */
const MAX_BODY_SIZE = 1_048_576;

/** Headers to skip when proxying (hop-by-hop or set by the platform) */
const SKIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
]);

/**
 * Response headers allowed to pass through from Heartwood. (HAWK-005)
 * Allowlist approach limits blast radius if Heartwood ever returns unexpected headers.
 */
const ALLOWED_RESPONSE_HEADERS = new Set([
  "content-type",
  "content-length",
  "set-cookie",
  "cache-control",
  "location",
  "vary",
  "etag",
  "last-modified",
  "x-request-id",
]);

/**
 * Auth-related cookie names to forward to Heartwood. (HAWK-007)
 * Only these cookies are sent — analytics, preferences, etc. are filtered out.
 */
const AUTH_COOKIE_NAMES = new Set([
  "grove_session",
  "session_token",
  "session",
  "access_token",
  "refresh_token",
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth-passkey",
  "better-auth.oauth_state",
]);

/** Check if a cookie name matches an auth cookie (exact or prefix match) */
function isAuthCookie(name: string): boolean {
  if (AUTH_COOKIE_NAMES.has(name)) return true;
  // Catch any future better-auth cookies by prefix
  if (name.startsWith("better-auth")) return true;
  if (name.startsWith("__Secure-better-auth")) return true;
  return false;
}

/**
 * Proxy a request to Heartwood via service binding and return the response.
 *
 * CSRF note: This function does NOT perform its own CSRF validation.
 * CSRF protection is handled by SvelteKit's built-in csrf.checkOrigin
 * (configured in svelte.config.js trustedOrigins), which runs for every
 * state-changing request before any route handler executes.
 *
 * @param event - The SvelteKit request event
 * @param targetPath - The full path to proxy to (e.g., "/api/auth/sign-in/social")
 */
export async function proxyToHeartwood(
  event: RequestEvent,
  targetPath: string,
): Promise<Response> {
  const { request, cookies, platform } = event;

  if (!platform?.env?.AUTH) {
    return new Response(JSON.stringify({ error: "Auth service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Body size check for state-changing requests (HAWK-006)
  if (!["GET", "HEAD"].includes(request.method)) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const authBaseUrl = platform.env.GROVEAUTH_URL || DEFAULT_AUTH_URL;
  const targetUrl = `${authBaseUrl}${targetPath}`;

  // Forward only auth-related cookies for session identification. (HAWK-007)
  const authCookies = cookies.getAll().filter((c) => isAuthCookie(c.name));
  const cookieHeader = authCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Build proxied request headers
  const proxyHeaders = new Headers();
  if (cookieHeader) {
    proxyHeaders.set("Cookie", cookieHeader);
  }

  // Forward relevant request headers
  for (const [key, value] of request.headers.entries()) {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      proxyHeaders.set(key, value);
    }
  }

  // Perform the service binding fetch
  const response = await platform.env.AUTH.fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
  });

  // Forward only allowed response headers (HAWK-005)
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
