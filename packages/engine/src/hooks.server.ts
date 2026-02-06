import type { Handle } from "@sveltejs/kit";
import {
  generateCSRFToken,
  generateSessionCSRFToken,
  validateCSRFToken,
  validateCSRF,
} from "$lib/utils/csrf.js";
import { error, redirect } from "@sveltejs/kit";
import {
  TURNSTILE_COOKIE_NAME,
  validateVerificationCookie,
} from "$lib/server/services/turnstile.js";
import type { TenantConfig } from "$lib/durable-objects/TenantDO.js";
import { TIERS, type TierKey } from "$lib/config/tiers.js";

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  // Use word boundary ((?:^|;\s*)) to prevent matching substrings
  // e.g. "session=" must not match inside "grove_session="
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Reserved subdomains that route to internal apps or have special handling.
 * Value is the route prefix to use, or null for external handling.
 */
const RESERVED_SUBDOMAINS: Record<string, string | null> = {
  www: "/", // Redirect to root
  auth: "/auth", // Auth routes
  admin: "/arbor", // Legacy admin subdomain → new arbor routes
  arbor: "/arbor", // Platform admin (Grove terminology)
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
  // SECURITY: Use raw Host header (not x-forwarded-host) for localhost detection
  // to prevent production bypass via spoofed forwarded headers
  const rawHost = request.headers.get("host") || "";
  if (rawHost.includes("localhost") || rawHost.includes("127.0.0.1")) {
    // Option 1: x-subdomain header (validate format to prevent injection)
    const headerSubdomain = request.headers.get("x-subdomain");
    if (headerSubdomain && isValidSubdomain(headerSubdomain)) {
      return headerSubdomain;
    }

    // Option 2: ?subdomain= query param (validate format to prevent injection)
    const paramSubdomain = url.searchParams.get("subdomain");
    if (paramSubdomain && isValidSubdomain(paramSubdomain)) {
      return paramSubdomain;
    }
  }

  return null;
}

/**
 * Extended tenant info returned from getTenantConfig
 * Includes both TenantConfig fields and the tenant UUID
 */
interface TenantLookupResult extends TenantConfig {
  id: string; // Tenant UUID from D1
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

/**
 * Extended tenant info including the tenant UUID
 */
interface TenantLookupResult extends TenantConfig {
  id: string;
}

/**
 * Validate subdomain format before database lookup.
 * Prevents SQL injection and ensures subdomains follow RFC 1035 label rules.
 *
 * Valid: lowercase alphanumeric, hyphens (not at start/end), 1-63 chars
 * Invalid: uppercase, underscores, dots, special chars, leading/trailing hyphens
 */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function isValidSubdomain(subdomain: string): boolean {
  return SUBDOMAIN_PATTERN.test(subdomain);
}

/**
 * Try to get tenant config from TenantDO first, fall back to D1
 *
 * TenantDO caches config in memory (including tenant ID), eliminating
 * D1 reads on hot paths. Falls back to D1 if DO unavailable.
 *
 * The X-Tenant-Subdomain header is passed to help TenantDO identify
 * itself on first access before config is cached.
 */
async function getTenantConfig(
  subdomain: string,
  platform: App.Platform | undefined,
): Promise<TenantLookupResult | null> {
  // SECURITY: Validate subdomain format before any DB operations
  // This prevents malformed subdomains from reaching the database
  if (!isValidSubdomain(subdomain)) {
    console.warn(
      `[Hooks] Invalid subdomain format rejected: ${subdomain.slice(0, 64)}`,
    );
    return null;
  }

  const db = platform?.env?.DB;
  if (!db) return null;

  // Try TenantDO first for cached config (includes tenant ID)
  const tenants = platform?.env?.TENANTS;
  if (tenants) {
    try {
      const doId = tenants.idFromName(`tenant:${subdomain}`);
      const stub = tenants.get(doId);

      // Pass subdomain header so TenantDO knows its identity on first access
      const response = await stub.fetch("https://tenant.internal/config", {
        headers: { "X-Tenant-Subdomain": subdomain },
      });

      if (response.ok) {
        const config = (await response.json()) as TenantConfig & {
          id?: string;
        };

        // TenantDO now caches tenant ID - no need for separate D1 query
        if (config.id && config.subdomain) {
          return {
            ...config,
            id: config.id,
          };
        }
      }
    } catch (err) {
      console.error("[Hooks] TenantDO lookup failed, falling back to D1:", err);
    }
  }

  // Fall back to D1 (first access or DO unavailable)
  try {
    const tenant = await db
      .prepare(
        "SELECT id, subdomain, display_name, email, theme, plan FROM tenants WHERE subdomain = ? AND active = 1",
      )
      .bind(subdomain)
      .first<{
        id: string;
        subdomain: string;
        display_name: string;
        email: string;
        theme: string | null;
        plan: string;
      }>();

    if (!tenant) return null;

    // Map D1 result to TenantConfig format
    const tier = (tenant.plan || "seedling") as TenantConfig["tier"];

    // Parse theme safely - handle both JSON objects and legacy plain strings
    let parsedTheme = null;
    if (tenant.theme) {
      try {
        // Try to parse as JSON (for structured theme config)
        parsedTheme = JSON.parse(tenant.theme);
      } catch {
        // Legacy plain string like "default" - treat as null (use default theme)
        parsedTheme = null;
      }
    }

    return {
      id: tenant.id,
      subdomain: tenant.subdomain,
      displayName: tenant.display_name,
      theme: parsedTheme,
      tier,
      ownerId: tenant.email,
      limits: getTierLimits(tier),
    };
  } catch (err) {
    console.error("[Hooks] D1 tenant lookup failed:", err);
    return null;
  }
}

/**
 * Get tier limits from centralized tiers.ts config
 */
function getTierLimits(tier: TenantConfig["tier"]): TenantConfig["limits"] {
  // Map TenantConfig tier to TierKey (they're compatible)
  const tierConfig = TIERS[tier as TierKey] ?? TIERS.seedling;

  return {
    postsPerMonth:
      tierConfig.limits.posts === Infinity ? -1 : tierConfig.limits.posts,
    storageBytes: tierConfig.limits.storage,
    customDomains: tierConfig.features.customDomain
      ? tier === "evergreen"
        ? 10
        : 1
      : 0,
  };
}

/**
 * Determine if a route needs 'unsafe-eval' in Content-Security-Policy.
 *
 * WHY these routes need this directive:
 * - Monaco Editor (admin): The code editor uses dynamic code evaluation for
 *   syntax highlighting, IntelliSense, and language services. This is a
 *   fundamental requirement of Monaco's architecture.
 * - Mermaid.js (admin + tenant pages): The diagram rendering library parses
 *   diagram definitions dynamically. This is required for flowcharts,
 *   sequence diagrams, and other Mermaid visualizations.
 *
 * SECURITY NOTES:
 * - This directive is ONLY enabled on routes that render user content with these tools
 * - All other routes use a strict CSP without dynamic code capabilities
 * - User input is still sanitized before being passed to these libraries
 *
 * Routes that need it:
 * - /admin/... - Monaco editor for Markdown/code editing, Mermaid for diagrams
 * - /[slug] (root tenant pages) - Mermaid diagrams in published content
 * - /.../preview - Preview routes for draft content with diagrams
 */
/**
 * Non-content root paths that should NEVER get unsafe-eval.
 * These are internal app routes, not user-generated content pages.
 */
const NON_CONTENT_ROOTS = [
  "/auth",
  "/api",
  "/verify",
  "/_app",
  "/login",
  "/logout",
  "/settings",
  "/arbor",
];

function needsUnsafeEval(pathname: string): boolean {
  return (
    pathname.startsWith("/arbor/") ||
    (/^\/[^/]+$/.test(pathname) &&
      !NON_CONTENT_ROOTS.some((p) => pathname.startsWith(p))) ||
    pathname.includes("/preview")
  );
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize context and user
  event.locals.user = null;
  event.locals.context = { type: "landing" };

  // =========================================================================
  // GROVE TERMINOLOGY REDIRECTS (SEO preservation)
  // =========================================================================
  // 301 redirects preserve SEO value while transitioning to new routes
  const pathname = event.url.pathname;

  // Phase 1: /blog → /garden
  if (pathname === "/blog" || pathname.startsWith("/blog/")) {
    const newPath = pathname.replace(/^\/blog/, "/garden");
    throw redirect(301, `${newPath}${event.url.search}`);
  }

  // Phase 2: /admin → /arbor (check specific routes first)
  // Legacy /admin/blog → /arbor/garden (combines both migrations)
  if (pathname === "/admin/blog" || pathname.startsWith("/admin/blog/")) {
    const newPath = pathname.replace(/^\/admin\/blog/, "/arbor/garden");
    throw redirect(301, `${newPath}${event.url.search}`);
  }
  // All other /admin routes → /arbor
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const newPath = pathname.replace(/^\/admin/, "/arbor");
    throw redirect(301, `${newPath}${event.url.search}`);
  }

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
      const isVerified = await validateVerificationCookie(
        verificationCookie ?? undefined,
        secretKey,
      );

      if (!isVerified) {
        // Redirect to verification page with return URL
        const returnUrl = encodeURIComponent(
          event.url.pathname + event.url.search,
        );
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
  // Must be a tenant subdomain - look up via TenantDO (cached) or D1 (fallback)
  else {
    const tenant = await getTenantConfig(subdomain, event.platform);

    if (!tenant) {
      // Subdomain not registered or inactive
      event.locals.context = { type: "not_found", subdomain };
    } else {
      // Valid tenant - set context (config from TenantDO cache)
      event.locals.context = {
        type: "tenant",
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.displayName,
          theme: tenant.theme ? JSON.stringify(tenant.theme) : null,
          ownerId: tenant.ownerId,
          plan: tenant.tier || "seedling",
        },
      };
      event.locals.tenantId = tenant.id;
    }
  }

  // =========================================================================
  // AUTHENTICATION (Heartwood SessionDO)
  // =========================================================================
  const cookieHeader = event.request.headers.get("cookie");

  // Try grove_session cookie first (SessionDO - fast path via service binding)
  // Also check for Better Auth session cookies (OAuth flow sets these)
  const groveSession = getCookie(cookieHeader, "grove_session");
  const betterAuthSession =
    getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
    getCookie(cookieHeader, "better-auth.session_token");
  const sessionCookie = groveSession || betterAuthSession;

  if (sessionCookie && event.platform?.env?.AUTH) {
    try {
      // Pass the full cookie header so GroveAuth can find whichever session cookie exists
      const response = await event.platform.env.AUTH.fetch(
        "https://auth-api.grove.place/session/validate",
        {
          method: "POST",
          headers: { Cookie: cookieHeader || "" },
        },
      );

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;

        // Validate response shape and extract user if valid
        if (
          data &&
          typeof data === "object" &&
          typeof data.valid === "boolean"
        ) {
          if (data.valid && data.user) {
            const user = data.user as Record<string, unknown>;
            // Only set user if all required fields are valid
            if (
              typeof user === "object" &&
              typeof user.id === "string" &&
              typeof user.email === "string" &&
              typeof user.name === "string" &&
              typeof user.avatarUrl === "string" &&
              typeof user.isAdmin === "boolean"
            ) {
              event.locals.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.avatarUrl,
                isAdmin: user.isAdmin,
              };
            } else {
              console.error(
                "[Auth] Invalid SessionDO response: user object has invalid fields",
              );
            }
          }
        } else {
          console.error("[Auth] Invalid SessionDO response: unexpected shape");
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
        // SECURITY: Use service binding when available (Worker-to-Worker, no public internet)
        // Falls back to bare fetch only when AUTH binding is unavailable (e.g., local dev)
        const authBinding = event.platform?.env?.AUTH;
        const userInfoResponse = authBinding
          ? await authBinding.fetch("https://auth-api.grove.place/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
          : await fetch(
              `${event.platform?.env?.GROVEAUTH_URL || "https://auth-api.grove.place"}/userinfo`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );

        if (userInfoResponse.ok) {
          const userInfo = (await userInfoResponse.json()) as Record<
            string,
            unknown
          >;

          // Validate response shape and set user if valid
          if (
            userInfo &&
            typeof userInfo === "object" &&
            typeof userInfo.sub === "string" &&
            typeof userInfo.email === "string" &&
            typeof userInfo.name === "string" &&
            typeof userInfo.picture === "string" &&
            typeof userInfo.provider === "string"
          ) {
            event.locals.user = {
              id: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              provider: userInfo.provider,
            };
          } else {
            console.error(
              "[Auth] Invalid userinfo response: unexpected shape or missing fields",
            );
          }
        }
      } catch (err) {
        console.error("[Auth] JWT fallback error:", err);
      }
    }
  }

  // =========================================================================
  // CSRF PROTECTION
  // =========================================================================
  // Use the shared getCookie helper for consistent cookie parsing
  let csrfToken: string | null = getCookie(cookieHeader, "csrf_token");
  const csrfSecret = event.platform?.env?.CSRF_SECRET;

  // Generate CSRF token: session-bound HMAC for authenticated users, random UUID for guests
  if (event.locals.user && csrfSecret && sessionCookie) {
    csrfToken = await generateSessionCSRFToken(sessionCookie, csrfSecret);
  } else if (!csrfToken) {
    csrfToken = generateCSRFToken();
  }

  event.locals.csrfToken = csrfToken;

  // Auto-validate CSRF on state-changing methods
  if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
    const isAuthEndpoint = event.url.pathname.includes("/auth/");
    // Turnstile verification is like auth - new visitors don't have CSRF tokens
    const isTurnstileEndpoint = event.url.pathname === "/api/verify/turnstile";
    // Admin API endpoints use their own auth gate (isAdmin check) — origin validation suffices
    const isAdminApi = event.url.pathname.startsWith("/api/admin/");
    // Passkey endpoints do their own origin validation and require session auth
    const isPasskeyApi = event.url.pathname.startsWith("/api/passkey/");
    // SvelteKit form actions have built-in CSRF protection via origin validation
    // Detect via: x-sveltekit-action header OR ?/ URL pattern
    const isSvelteKitAction =
      event.request.headers.get("x-sveltekit-action") === "true";
    const isFormActionUrl = event.url.search.startsWith("?/");
    const isFormAction = isSvelteKitAction || isFormActionUrl;

    // Get the CSRF token from the request header for fallback validation
    const requestCsrfToken =
      event.request.headers.get("x-csrf-token") ||
      event.request.headers.get("csrf-token");

    // All form actions and auth endpoints use origin-based validation
    // (proxy-aware: checks Origin against X-Forwarded-Host, not just Host)
    // SvelteKit's built-in CSRF is disabled because it doesn't understand
    // our grove-router proxy setup (compares Origin against internal Host).
    // SECURITY: When Origin is absent, falls back to CSRF token validation
    if (
      isFormAction ||
      isAuthEndpoint ||
      isTurnstileEndpoint ||
      isAdminApi ||
      isPasskeyApi
    ) {
      if (
        !validateCSRF(event.request, false, {
          csrfToken: requestCsrfToken,
          expectedToken: csrfToken,
        })
      ) {
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
  // Generate a per-request nonce for CSP script-src (replaces 'unsafe-inline')
  const cspNonce = crypto.randomUUID().replace(/-/g, "");

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      // Inject nonce into ALL script tags (theme-detection, hydration, data serialization)
      // Must use global regex — String.replace() only hits the first match,
      // leaving SvelteKit's additional <script> tags blocked by CSP
      return html.replace(/<script(?=[\s>])/g, `<script nonce="${cspNonce}"`);
    },
  });

  // Set CSRF token cookie — always refresh for authenticated users (session-bound)
  // or set once for unauthenticated users
  const needsCsrfCookie =
    event.locals.user || !cookieHeader?.includes("csrf_token=");
  if (needsCsrfCookie) {
    const isProduction =
      event.url.hostname !== "localhost" && event.url.hostname !== "127.0.0.1";
    const cookieParts = [
      `csrf_token=${csrfToken}`,
      "Path=/",
      // Session-scoped for authenticated users, 1 hour for guests
      `Max-Age=${event.locals.user ? 86400 : 3600}`,
      "SameSite=Lax",
    ];

    if (isProduction) {
      cookieParts.push("Secure");
      // SECURITY: No Domain attribute — cookie scoped to exact subdomain only
      // This prevents cross-tenant CSRF token sharing (M-3)
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
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // Content-Security-Policy
  // Nonce-based script-src replaces 'unsafe-inline' for stronger XSS protection.
  // 'unsafe-eval' is only allowed on routes that need Mermaid diagram rendering.
  // challenges.cloudflare.com is required for Turnstile (Shade).
  const hasUnsafeEval = needsUnsafeEval(event.url.pathname);
  const scriptSrc = `'self' 'nonce-${cspNonce}' ${hasUnsafeEval ? "'unsafe-eval' " : ""}https://cdn.jsdelivr.net https://challenges.cloudflare.com`;

  const csp = [
    "default-src 'self'",
    "upgrade-insecure-requests",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.grove.place data:",
    "font-src 'self' https://cdn.grove.place",
    "connect-src 'self' https://api.github.com https://grove.place https://*.grove.place https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
