import type { Handle } from "@sveltejs/kit";
import {
  generateCSRFToken,
  validateCSRFToken,
  validateCSRF,
} from "$lib/utils/csrf.js";
import { error, redirect } from "@sveltejs/kit";
import {
  TURNSTILE_COOKIE_NAME,
  validateVerificationCookie,
} from "$lib/server/services/turnstile.js";

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Reserved subdomains that route to internal apps or have special handling.
 * Value is the route prefix to use, or null for external handling.
 */
const RESERVED_SUBDOMAINS: Record<string, string | null> = {
  www: "/", // Redirect to root
  auth: "/auth", // Auth routes
  admin: "/admin", // Platform admin
  api: "/api", // API routes
  domains: "/(apps)/domains", // Forage - Domain discovery tool
  monitor: "/(apps)/monitor", // GroveMonitor
  cdn: null, // Handled by R2 directly
  staging: null, // Staging environment flag
};

/**
 * Subdomains that are separate Workers (not consolidated).
 * These should not be routed by this hook.
 */
const EXTERNAL_WORKERS = ["scout", "music", "search"];

/**
 * Extract subdomain from hostname.
 * Handles both production (*.grove.place) and local development.
 */
function extractSubdomain(
  host: string,
  request: Request,
  url: URL,
): string | null {
  const parts = host.split(".");

  // Production: *.grove.place
  if (host.includes("grove.place")) {
    // grove.place has 2 parts, subdomain.grove.place has 3
    return parts.length > 2 ? parts[0] : null;
  }

  // Local development: Check for subdomain simulation
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    // Option 1: x-subdomain header
    const headerSubdomain = request.headers.get("x-subdomain");
    if (headerSubdomain) {
      return headerSubdomain;
    }

    // Option 2: ?subdomain= query param
    const paramSubdomain = url.searchParams.get("subdomain");
    if (paramSubdomain) {
      return paramSubdomain;
    }
  }

  return null;
}

/**
 * Paths that should skip Turnstile verification
 */
const TURNSTILE_EXCLUDED_PATHS = [
  "/verify", // The verification page itself
  "/api/", // All API routes
  "/auth/", // Auth routes (OAuth callbacks)
  "/_app/", // SvelteKit internals
  "/favicon", // Static assets
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/",
];

/**
 * Check if a path should skip Turnstile verification
 */
function shouldSkipTurnstile(pathname: string): boolean {
  return TURNSTILE_EXCLUDED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize context and user
  event.locals.user = null;
  event.locals.context = { type: "landing" };

  // =========================================================================
  // TURNSTILE VERIFICATION (Shade)
  // =========================================================================
  // Skip verification for excluded paths
  if (!shouldSkipTurnstile(event.url.pathname)) {
    const cookieHeader = event.request.headers.get("cookie");
    const verificationCookie = getCookie(cookieHeader, TURNSTILE_COOKIE_NAME);
    const secretKey = event.platform?.env?.TURNSTILE_SECRET_KEY;

    // Only enforce if Turnstile is configured (has secret key)
    if (secretKey) {
      const isVerified = await validateVerificationCookie(verificationCookie ?? undefined, secretKey);

      if (!isVerified) {
        // Redirect to verification page with return URL
        const returnUrl = encodeURIComponent(event.url.pathname + event.url.search);
        throw redirect(302, `/verify?return=${returnUrl}`);
      }
    }
  }

  // =========================================================================
  // SUBDOMAIN ROUTING
  // =========================================================================
  // Check X-Forwarded-Host first (set by grove-router Worker proxy)
  // Fall back to host header for direct requests
  const host =
    event.request.headers.get("x-forwarded-host") ||
    event.request.headers.get("host") ||
    "";
  const subdomain = extractSubdomain(host, event.request, event.url);

  // No subdomain = landing page (grove.place)
  if (!subdomain || subdomain === "grove") {
    event.locals.context = { type: "landing" };
  }
  // Check if it's a reserved subdomain
  else if (subdomain in RESERVED_SUBDOMAINS) {
    const routePrefix = RESERVED_SUBDOMAINS[subdomain];

    if (routePrefix === null) {
      // External handling (CDN, staging, etc.)
      return new Response("Not handled by this worker", { status: 404 });
    }

    if (subdomain === "www") {
      // Redirect www to root
      return new Response(null, {
        status: 301,
        headers: { Location: `https://grove.place${event.url.pathname}` },
      });
    }

    event.locals.context = {
      type: "app",
      app: subdomain,
      routePrefix,
    };
  }
  // Check if it's an external worker (not consolidated yet)
  else if (EXTERNAL_WORKERS.includes(subdomain)) {
    // These are handled by separate Workers, shouldn't hit this
    return new Response("Service not found", { status: 404 });
  }
  // Must be a tenant subdomain - look up in D1
  else {
    const db = event.platform?.env?.DB;
    if (!db) {
      console.error("[Hooks] D1 database not available");
      event.locals.context = { type: "not_found", subdomain };
    } else {
      try {
        const tenant = await db
          .prepare(
            "SELECT id, subdomain, display_name, email, theme FROM tenants WHERE subdomain = ? AND active = 1",
          )
          .bind(subdomain)
          .first<{
            id: string;
            subdomain: string;
            display_name: string;
            email: string;
            theme: string | null;
          }>();

        if (!tenant) {
          // Subdomain not registered or inactive
          event.locals.context = { type: "not_found", subdomain };
        } else {
          // Valid tenant - set context
          event.locals.context = {
            type: "tenant",
            tenant: {
              id: tenant.id,
              subdomain: tenant.subdomain,
              name: tenant.display_name,
              theme: tenant.theme,
              ownerId: tenant.email,
            },
          };
          event.locals.tenantId = tenant.id;
        }
      } catch (err) {
        console.error("[Hooks] Error looking up tenant:", err);
        event.locals.context = { type: "not_found", subdomain };
      }
    }
  }

  // =========================================================================
  // AUTHENTICATION (Heartwood SessionDO)
  // =========================================================================
  const cookieHeader = event.request.headers.get("cookie");

  // Try grove_session cookie first (SessionDO - fast path via service binding)
  const groveSession = getCookie(cookieHeader, "grove_session");
  if (groveSession && event.platform?.env?.AUTH) {
    try {
      const response = await event.platform.env.AUTH.fetch(
        "https://auth-api.grove.place/session/validate",
        {
          method: "POST",
          headers: { Cookie: `grove_session=${groveSession}` },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Validate response shape
        if (!data || typeof data !== 'object') {
          console.error('[Auth] Invalid SessionDO response: expected object');
          return;
        }

        if (typeof data.valid !== 'boolean') {
          console.error('[Auth] Invalid SessionDO response: valid must be boolean');
          return;
        }

        // Validate user object if present
        if (data.valid && data.user) {
          const user = data.user;
          if (
            typeof user !== 'object' ||
            typeof user.id !== 'string' ||
            typeof user.email !== 'string' ||
            typeof user.name !== 'string' ||
            typeof user.avatarUrl !== 'string' ||
            typeof user.isAdmin !== 'boolean'
          ) {
            console.error('[Auth] Invalid SessionDO response: user object has invalid fields');
            return;
          }

          event.locals.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.avatarUrl,
            isAdmin: user.isAdmin,
          };
        }
      }
    } catch (err) {
      console.error("[Auth] SessionDO validation error:", err);
    }
  }

  // Fallback to access_token cookie (legacy JWT - for backwards compatibility)
  if (!event.locals.user) {
    const accessToken = getCookie(cookieHeader, "access_token");
    if (accessToken) {
      try {
        const authBaseUrl =
          event.platform?.env?.GROVEAUTH_URL || "https://auth-api.grove.place";

        const userInfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();

          // Validate response shape
          if (!userInfo || typeof userInfo !== 'object') {
            console.error('[Auth] Invalid userinfo response: expected object');
            return;
          }

          // Validate required fields
          if (
            typeof userInfo.sub !== 'string' ||
            typeof userInfo.email !== 'string' ||
            typeof userInfo.name !== 'string' ||
            typeof userInfo.picture !== 'string' ||
            typeof userInfo.provider !== 'string'
          ) {
            console.error('[Auth] Invalid userinfo response: missing or invalid required fields');
            return;
          }

          event.locals.user = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            provider: userInfo.provider,
          };
        }
      } catch (err) {
        console.error("[Auth] JWT fallback error:", err);
      }
    }
  }

  // =========================================================================
  // CSRF PROTECTION
  // =========================================================================
  let csrfToken: string | null = null;
  if (cookieHeader) {
    const match = cookieHeader.match(/csrf_token=([^;]+)/);
    if (match) {
      csrfToken = match[1];
    }
  }

  if (!csrfToken) {
    csrfToken = generateCSRFToken();
  }

  event.locals.csrfToken = csrfToken;

  // Auto-validate CSRF on state-changing methods
  if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
    const isAuthEndpoint = event.url.pathname.includes("/auth/");
    // Turnstile verification is like auth - new visitors don't have CSRF tokens
    const isTurnstileEndpoint = event.url.pathname === "/api/verify/turnstile";

    if (isAuthEndpoint || isTurnstileEndpoint) {
      // Auth and verification endpoints use origin-based validation (users don't have CSRF tokens yet)
      if (!validateCSRF(event.request)) {
        throw error(403, "Invalid origin");
      }
    } else {
      // All other endpoints require CSRF token validation
      if (!validateCSRFToken(event.request, csrfToken)) {
        throw error(403, "Invalid CSRF token");
      }
    }
  }

  // =========================================================================
  // RESOLVE & SECURITY HEADERS
  // =========================================================================
  const response = await resolve(event);

  // Set CSRF token cookie if it was just generated
  if (!cookieHeader || !cookieHeader.includes("csrf_token=")) {
    const isProduction =
      event.url.hostname !== "localhost" && event.url.hostname !== "127.0.0.1";
    const cookieParts = [
      `csrf_token=${csrfToken}`,
      "Path=/",
      "Max-Age=604800", // 7 days
      "SameSite=Lax",
    ];

    if (isProduction) {
      cookieParts.push("Secure");
      // Set cookie for all subdomains
      cookieParts.push("Domain=.grove.place");
    }

    response.headers.append("Set-Cookie", cookieParts.join("; "));
  }

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  // Content-Security-Policy
  // Note: 'unsafe-eval' is required for Mermaid diagram rendering
  // Note: 'unsafe-inline' is used for the theme script in app.html
  // Note: challenges.cloudflare.com is required for Turnstile (Shade)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.autumnsgrove.com https://cdn.grove.place data:",
    "font-src 'self' https://cdn.grove.place",
    "connect-src 'self' https://api.github.com https://*.grove.place https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
