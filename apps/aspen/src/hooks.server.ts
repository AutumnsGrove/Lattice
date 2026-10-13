import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import {
	generateCSRFToken,
	generateSessionCSRFToken,
	validateCSRFToken,
	validateCSRF,
} from "@autumnsgrove/lattice/utils/csrf";
import { error, redirect } from "@sveltejs/kit";
import { SITE_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import {
	pulseHandle,
	createPulseFlushHook,
	createPulseErrorHook,
} from "@autumnsgrove/lattice/pulse";
import {
	TURNSTILE_COOKIE_NAME,
	validateVerificationCookie,
} from "@autumnsgrove/lattice/server/services/turnstile";
import type { TenantConfig } from "@autumnsgrove/lattice/durable-objects/TenantDO";
import { TIERS, type TierKey } from "@autumnsgrove/lattice/platform/config/tiers";
import {
	getCookie,
	extractSessionCookie,
	setSecurityHeaders,
	validateGroveSession,
} from "@autumnsgrove/lattice/server";
import { getUserByTenantId } from "@autumnsgrove/lattice/server/services/users";

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
};

/**
 * Subdomains that are separate Workers (not consolidated).
 * These should not be routed by this hook.
 */
const EXTERNAL_WORKERS = ["scout", "music", "search"];

/**
 * Beta environment suffix on the first label: <tenant>-beta.grove.place.
 * Single-label (not beta.<tenant>.grove.place) because this zone's edge
 * cert only covers *.grove.place, not *.*.grove.place.
 */
const BETA_SUFFIX = "-beta";

/**
 * Strip a trailing "-beta" suffix from a *.grove.place hostname's first label.
 * autumn-beta.grove.place -> { host: "autumn.grove.place", isBeta: true }
 * Everything else is passed through unchanged.
 */
function stripBetaLabel(host: string): { host: string; isBeta: boolean } {
	const parts = host.split(".");
	const [first, ...rest] = parts;
	if (
		host.includes("grove.place") &&
		first.endsWith(BETA_SUFFIX) &&
		first.length > BETA_SUFFIX.length
	) {
		const tenant = first.slice(0, -BETA_SUFFIX.length);
		return { host: [tenant, ...rest].join("."), isBeta: true };
	}
	return { host, isBeta: false };
}

/**
 * Extract subdomain from hostname.
 * Handles both production (*.grove.place) and local development.
 */
function extractSubdomain(host: string, request: Request, url: URL): string | null {
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

		// Option 3: sticky cookie from a previous ?subdomain= request (see
		// LOCAL_SUBDOMAIN_COOKIE_NAME below). Production doesn't need this —
		// the Host header IS the tenant on every request. Locally, internal
		// links/refreshes don't carry ?subdomain= forward, so without this
		// the very next click falls through to the hardcoded default below.
		const cookieSubdomain = getCookie(request.headers.get("cookie"), LOCAL_SUBDOMAIN_COOKIE_NAME);
		if (cookieSubdomain && isValidSubdomain(cookieSubdomain)) {
			return cookieSubdomain;
		}

		// Option 4: Default tenant for local dev (no header, param, or cookie needed)
		return "midnight-bloom";
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
 * Social/embed crawlers that need to read meta tags for rich previews.
 * These bots can't solve Turnstile challenges and only read HTML.
 */
const EMBED_CRAWLER_PATTERNS = [
	"Discordbot",
	"Twitterbot",
	"facebookexternalhit",
	"LinkedInBot",
	"Slackbot",
	"TelegramBot",
	"WhatsApp",
	"Googlebot",
	"bingbot",
];

function isEmbedCrawler(userAgent: string | null): boolean {
	if (!userAgent) return false;
	return EMBED_CRAWLER_PATTERNS.some((bot) => userAgent.includes(bot));
}

/**
 * Check if a request should skip Turnstile verification
 */
function shouldSkipTurnstile(pathname: string, userAgent: string | null): boolean {
	if (TURNSTILE_EXCLUDED_PATHS.some((prefix) => pathname.startsWith(prefix))) return true;
	if (isEmbedCrawler(userAgent)) return true;
	return false;
}

/**
 * Cookie that keeps demo mode active across navigation. The `?demo=` query
 * param only proves the secret once, on the request that carries it — every
 * link clicked afterward would drop it and re-trigger Turnstile/auth. This
 * mirrors that one proof into a cookie so the rest of the session stays in
 * demo mode. Must match the constant of the same name in
 * arbor/+layout.server.ts, which reads it for the auth-bypass check.
 */
const DEMO_MODE_COOKIE_NAME = "grove_demo_mode";

/**
 * Sticky local tenant simulation. Set whenever a localhost request carries
 * ?subdomain=, read back by extractSubdomain() so the next request without
 * the param (a refresh, a relative link, a redirect from Plant) keeps
 * simulating the same tenant instead of falling back to "midnight-bloom".
 * Never set/read outside localhost/127.0.0.1 — see isLocalhost gating below.
 */
const LOCAL_SUBDOMAIN_COOKIE_NAME = "grove_local_subdomain";

/**
 * Demo identity override. Lets a demo session act as a DIFFERENT seeded
 * tenant's owner than the one currently being viewed (set/cleared via
 * apps/aspen/src/routes/api/dev/demo-identity/+server.ts) — needed to test
 * cross-account features (Lantern friends, Reeds comments) where you must
 * view Tenant A's page while logged in as Tenant B's owner. Only ever read
 * inside the isDemoModeActive branch below, so it's inert without
 * DEMO_MODE_SECRET (never set in production).
 */
const DEMO_IDENTITY_COOKIE_NAME = "grove_demo_identity";

/**
 * Demo mode bypasses the human-verification gate too — it's off by default
 * unless DEMO_MODE_SECRET is set (never in production), and a request that
 * already proved it knows the secret (via the query param or the cookie set
 * below) has no need to also solve Turnstile.
 */
function isDemoModeRequest(
	url: URL,
	demoModeSecret: string | undefined,
	cookieHeader: string | null,
): boolean {
	if (!demoModeSecret) return false;
	if (url.searchParams.get("demo") === demoModeSecret) return true;
	return getCookie(cookieHeader, DEMO_MODE_COOKIE_NAME) === demoModeSecret;
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
 * Check if a subdomain has an active username redirect (30-day hold).
 * Only called on the 404 path (subdomain not found), not on every request.
 *
 * Returns the new subdomain to redirect to, or null if no redirect exists.
 */
async function checkUsernameRedirect(
	subdomain: string,
	platform: App.Platform | undefined,
): Promise<string | null> {
	const db = platform?.env?.DB;
	if (!db) return null;

	try {
		const row = await db
			.prepare(
				`SELECT new_subdomain FROM username_history
         WHERE old_subdomain = ? AND released = 0 AND hold_expires_at > unixepoch()
         ORDER BY changed_at DESC LIMIT 1`,
			)
			.bind(subdomain)
			.first<{ new_subdomain: string }>();

		return row?.new_subdomain ?? null;
	} catch (err) {
		console.error("[Hooks] Username redirect lookup failed:", err);
		return null;
	}
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
		console.warn(`[Hooks] Invalid subdomain format rejected: ${subdomain.slice(0, 64)}`);
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
		postsPerMonth: tierConfig.limits.posts === Infinity ? -1 : tierConfig.limits.posts,
		storageBytes: tierConfig.limits.storage,
		storageDisplay: tierConfig.limits.storageDisplay,
		customDomains: tierConfig.features.customDomain ? (tier === "evergreen" ? 10 : 1) : 0,
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
		(/^\/[^/]+$/.test(pathname) && !NON_CONTENT_ROOTS.some((p) => pathname.startsWith(p))) ||
		pathname.includes("/preview")
	);
}

/**
 * Image hosts the local dev seed data points at (remote stock photos, nothing
 * downloaded or stored). Only ever added to img-src on localhost, so the
 * production policy is untouched.
 */
const LOCAL_SEED_IMAGE_HOSTS = ["https://images.unsplash.com", "https://images.pexels.com"];

const aspenHandle: Handle = async ({ event, resolve }) => {
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

	// Phase 3: /comments → /reeds (arbor and API routes)
	if (pathname === "/arbor/comments" || pathname.startsWith("/arbor/comments/")) {
		const newPath = pathname.replace(/^\/arbor\/comments/, "/arbor/reeds");
		throw redirect(301, `${newPath}${event.url.search}`);
	}
	// Redirect old API comment routes to /api/reeds/. The regex has no $ anchor,
	// so nested paths like /api/blooms/slug/comments/123/moderate are preserved:
	//   /api/blooms/my-post/comments       → /api/reeds/my-post
	//   /api/blooms/my-post/comments/abc   → /api/reeds/my-post/abc
	//   /api/blooms/my-post/comments/abc/moderate → /api/reeds/my-post/abc/moderate
	if (pathname.startsWith("/api/blooms/") && pathname.includes("/comments")) {
		const newPath = pathname.replace(/^\/api\/blooms\/([^/]+)\/comments/, "/api/reeds/$1");
		throw redirect(301, `${newPath}${event.url.search}`);
	}

	// =========================================================================
	// COOKIE EXTRACTION (hoisted for parallel auth + routing)
	// =========================================================================
	// Extracted early so auth validation can start concurrently with subdomain
	// routing. Used by: Turnstile, auth, CSRF, rate limiting.
	const cookieHeader = event.request.headers.get("cookie");

	// =========================================================================
	// TURNSTILE VERIFICATION (Shade)
	// =========================================================================
	const demoModeSecret = event.platform?.env?.DEMO_MODE_SECRET;
	const isDemoModeActive = isDemoModeRequest(event.url, demoModeSecret, cookieHeader);
	event.locals.isDemoMode = isDemoModeActive;

	// Skip verification for excluded paths, embed crawlers, and demo mode
	if (
		!shouldSkipTurnstile(event.url.pathname, event.request.headers.get("user-agent")) &&
		!isDemoModeActive
	) {
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
				const returnUrl = encodeURIComponent(event.url.pathname + event.url.search);
				throw redirect(302, `/verify?return=${returnUrl}`);
			}
		}
	}

	// =========================================================================
	// AUTHENTICATION — start SessionDO validation early (parallel with routing)
	// =========================================================================
	// PERFORMANCE: Auth only needs cookies, not tenant context. Starting the
	// SessionDO fetch here lets it run concurrently with the tenant lookup in
	// subdomain routing, saving ~100-300ms on tenant page loads.
	const sessionCookie = extractSessionCookie(cookieHeader);

	const sessionAuthPromise =
		sessionCookie && event.platform?.env?.AUTH
			? validateGroveSession(
					event.platform.env.AUTH,
					event.request,
					sessionCookie,
					cookieHeader || "",
					event.platform?.context?.waitUntil?.bind(event.platform.context),
				)
			: Promise.resolve(null as Response | null);

	// =========================================================================
	// SUBDOMAIN ROUTING
	// =========================================================================
	// Check X-Forwarded-Host first (set by grove-router Worker proxy)
	// Fall back to host header for direct requests
	const rawHost =
		event.request.headers.get("x-forwarded-host") || event.request.headers.get("host") || "";
	const { host, isBeta } = stripBetaLabel(rawHost);
	event.locals.isBeta = isBeta;
	const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
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
			// Before showing 404, check if this is an old subdomain with an active redirect
			const redirectTarget = await checkUsernameRedirect(subdomain, event.platform);
			if (redirectTarget) {
				// 302 (not 301): the hold expires after 30 days and the old subdomain
				// can be re-registered. A cached 301 would permanently bypass the new owner.
				throw redirect(
					302,
					`https://${redirectTarget}.grove.place${event.url.pathname}${event.url.search}`,
				);
			}
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
	// AUTHENTICATION — resolve the parallel SessionDO validation
	// =========================================================================
	// The fetch was started before subdomain routing — it ran concurrently with
	// tenant lookup, so by now the response is likely already available.
	const authResponse = await sessionAuthPromise;
	if (authResponse?.ok) {
		try {
			const data = (await authResponse.json()) as Record<string, unknown>;

			// Validate response shape and extract user if valid
			if (data && typeof data === "object" && typeof data.valid === "boolean") {
				if (data.valid && data.user) {
					const user = data.user as Record<string, unknown>;
					// Only set user if all required fields are valid
					// avatarUrl is optional (nullable in Heartwood DB schema)
					if (
						typeof user === "object" &&
						typeof user.id === "string" &&
						typeof user.email === "string" &&
						typeof user.name === "string" &&
						typeof user.isAdmin === "boolean"
					) {
						// Extract preferences if present
						const prefs = user.preferences as Record<string, unknown> | undefined;
						event.locals.user = {
							id: user.id,
							email: user.email,
							name: user.name,
							picture: typeof user.avatarUrl === "string" ? user.avatarUrl : undefined,
							isAdmin: user.isAdmin,
							preferences: prefs
								? {
										theme: typeof prefs.theme === "string" ? prefs.theme : null,
										groveMode: typeof prefs.groveMode === "boolean" ? prefs.groveMode : null,
										season: typeof prefs.season === "string" ? prefs.season : null,
									}
								: undefined,
						};
					} else {
						console.error("[Auth] Invalid SessionDO response: user object has invalid fields");
					}
				}
			} else {
				console.error("[Auth] Invalid SessionDO response: unexpected shape");
			}
		} catch (err) {
			console.error("[Auth] SessionDO response parsing error:", err);
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
					? await authBinding.fetch("https://login.grove.place/userinfo", {
							headers: { Authorization: `Bearer ${accessToken}` },
						})
					: await fetch(
							`${event.platform?.env?.GROVEAUTH_URL || "https://login.grove.place"}/userinfo`,
							{
								headers: { Authorization: `Bearer ${accessToken}` },
							},
						);

				if (userInfoResponse.ok) {
					const userInfo = (await userInfoResponse.json()) as Record<string, unknown>;

					// Validate response shape and set user if valid
					// picture is optional (nullable in Heartwood DB schema)
					if (
						userInfo &&
						typeof userInfo === "object" &&
						typeof userInfo.sub === "string" &&
						typeof userInfo.email === "string" &&
						typeof userInfo.name === "string" &&
						typeof userInfo.provider === "string"
					) {
						event.locals.user = {
							id: userInfo.sub,
							email: userInfo.email,
							name: userInfo.name,
							picture: typeof userInfo.picture === "string" ? userInfo.picture : undefined,
							provider: userInfo.provider,
						};
					} else {
						console.error("[Auth] Invalid userinfo response: unexpected shape or missing fields");
					}
				}
			} catch (err) {
				console.error("[Auth] JWT fallback error:", err);
			}
		}
	}

	// =========================================================================
	// DEV-ONLY: Simulated auth for Glimpse visual testing
	// =========================================================================
	// Allows Glimpse to test authenticated pages without Heartwood running.
	// Only works when ALL THREE conditions are met:
	//   1. DEV_AUTH_ENABLED env var is truthy (never set in production wrangler.toml)
	//   2. Host header is localhost/127.0.0.1 (defense-in-depth)
	//   3. x-grove-dev-auth header carries a valid JSON user object
	// The env var gate makes this dead code in production regardless of
	// header spoofing — if DEV_AUTH_ENABLED doesn't exist, nothing happens.
	if (!event.locals.user && event.platform?.env?.DEV_AUTH_ENABLED) {
		const rawHost = event.request.headers.get("host") || "";
		if (rawHost.includes("localhost") || rawHost.includes("127.0.0.1")) {
			const devAuth = event.request.headers.get("x-grove-dev-auth");
			if (devAuth) {
				try {
					const mockUser = JSON.parse(devAuth);
					if (
						typeof mockUser === "object" &&
						typeof mockUser.id === "string" &&
						typeof mockUser.email === "string" &&
						typeof mockUser.name === "string"
					) {
						event.locals.user = {
							id: mockUser.id,
							email: mockUser.email,
							name: mockUser.name,
							picture: mockUser.picture || "",
							isAdmin: mockUser.isAdmin === true,
						};
					}
				} catch {
					// Invalid JSON — ignore silently
				}
			}
		}
	}

	// =========================================================================
	// INTERNAL SERVICE AUTH (worker-to-worker)
	// =========================================================================
	// Allows trusted internal services to call API endpoints via service binding
	// without a Heartwood session. The service must provide a valid
	// X-Internal-Service-Key and X-Tenant-Id header.
	if (!event.locals.user) {
		const internalKey = event.request.headers.get("X-Internal-Service-Key");
		const internalTenant = event.request.headers.get("X-Tenant-Id");
		if (internalKey && internalTenant) {
			const expected = event.platform?.env?.INTERNAL_SERVICE_KEY;
			if (expected) {
				// Timing-safe comparison via HMAC to prevent timing attacks.
				// HMAC outputs are always 32 bytes (SHA-256) regardless of input
				// length, so no information about key length is leaked.
				const encoder = new TextEncoder();
				const aBytes = encoder.encode(internalKey);
				const bBytes = encoder.encode(expected);
				const hmacKey = await crypto.subtle.importKey(
					"raw",
					aBytes,
					{ name: "HMAC", hash: "SHA-256" },
					false,
					["sign"],
				);
				const [sig, exp] = await Promise.all([
					crypto.subtle.sign("HMAC", hmacKey, bBytes).then((b) => new Uint8Array(b)),
					crypto.subtle.sign("HMAC", hmacKey, aBytes).then((b) => new Uint8Array(b)),
				]);
				let diff = 0;
				for (let i = 0; i < sig.length; i++) {
					diff |= sig[i] ^ exp[i];
				}
				if (diff === 0) {
					event.locals.user = {
						id: "system:internal-service",
						email: "system@grove.internal",
						name: "Internal Service",
						picture: "",
					};
					event.locals.tenantId = internalTenant;
					event.locals.isInternalService = true;
				}
			}
		}
	}

	// =========================================================================
	// DEMO MODE: simulate being the tenant owner
	// =========================================================================
	// Demo mode already bypasses Turnstile/login so visitors can browse Arbor
	// without a real Heartwood session — but it never set locals.user, so
	// every write action (saving/publishing a bloom, anything gated on
	// isOwner) still demanded a real login. Only runs when demo mode proved
	// itself for this request; the email must equal the tenant's ownerId
	// exactly since isOwner checks elsewhere use emailsMatch(tenant.ownerId,
	// user.email).
	//
	// Identity defaults to whichever tenant is being VIEWED, but a
	// grove_demo_identity cookie can override it to a DIFFERENT tenant —
	// letting a demo session view Tenant A's page while logged in as Tenant
	// B's owner. That's required for testing cross-account features (Lantern
	// friends, Reeds comments) where viewing and acting-as can't be the same
	// tenant. See apps/aspen/src/routes/api/dev/demo-identity/+server.ts.
	if (!event.locals.user && isDemoModeActive) {
		const db = event.platform?.env?.DB;
		let identityTenant: { id: string; name: string; ownerId: string } | null = null;

		const identityTenantId = getCookie(cookieHeader, DEMO_IDENTITY_COOKIE_NAME);
		if (identityTenantId && db) {
			try {
				const row = await db
					.prepare(
						"SELECT id, display_name AS name, email AS ownerId FROM tenants WHERE id = ? AND active = 1",
					)
					.bind(identityTenantId)
					.first<{ id: string; name: string; ownerId: string }>();
				identityTenant = row ?? null;
			} catch (err) {
				console.error("[Hooks] Demo identity tenant lookup failed:", err);
			}
		}

		const tenant =
			identityTenant ??
			(event.locals.context.type === "tenant" ? event.locals.context.tenant : null);

		if (tenant) {
			// Look up the real users row Plant's demo signup created for this
			// tenant (libs/.../tenant.ts createTenant step 4b). Every demo tenant
			// used to collapse onto the literal id "demo-owner" here, so no matter
			// which tenant you were simulating, per-user state (drafts, prefs,
			// anything keyed on user id) all pointed at the same identity. Falls
			// back to a still-per-tenant-unique id for older seed-only tenants
			// that never went through Plant and have no users row.
			let ownerUserId = `demo-owner:${tenant.id}`;
			if (db) {
				try {
					const ownerUser = await getUserByTenantId(db, tenant.id);
					if (ownerUser) {
						ownerUserId = ownerUser.id;
					}
				} catch (err) {
					console.error("[Hooks] Demo-mode owner user lookup failed:", err);
				}
			}

			event.locals.user = {
				id: ownerUserId,
				email: tenant.ownerId,
				name: `${tenant.name} (Demo)`,
				picture: "",
				isAdmin: false,
			};
		}
	}

	// =========================================================================
	// REQUEST BODY SIZE VALIDATION (HAWK-008)
	// =========================================================================
	// Reject oversized request bodies before processing.
	// Cloudflare Workers have a 100MB limit, but we enforce a tighter 1MB limit
	// for JSON API endpoints to prevent abuse. File uploads are excluded.
	if (["POST", "PUT", "PATCH"].includes(event.request.method)) {
		const contentLength = event.request.headers.get("content-length");
		const contentType = event.request.headers.get("content-type") || "";
		const isJsonOrUrlEncoded =
			contentType.includes("application/json") ||
			contentType.includes("application/x-www-form-urlencoded");
		// multipart/form-data is excluded — it's used for file uploads which
		// have their own size limits in each upload endpoint (e.g. 10MB for images)

		// 1MB limit for JSON/URL-encoded requests, skip for file uploads
		const MAX_BODY_SIZE = 1024 * 1024;
		if (contentLength && isJsonOrUrlEncoded && parseInt(contentLength) > MAX_BODY_SIZE) {
			return new Response(
				JSON.stringify({
					error: "payload_too_large",
					message: "Request body exceeds maximum allowed size.",
				}),
				{
					status: 413,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	// =========================================================================
	// API RATE LIMITING (HAWK-002)
	// =========================================================================
	// Global rate limit for API routes. DO-first (per-user/IP isolation),
	// falls back to KV when THRESHOLD binding is absent (local dev, etc.).
	// Fails open if neither backend is available.
	if (event.url.pathname.startsWith("/api/")) {
		const [{ createThreshold }, { thresholdCheck }, { getClientIP }] = await Promise.all([
			import("@autumnsgrove/lattice/platform/threshold/factory"),
			import("@autumnsgrove/lattice/platform/threshold/sveltekit"),
			import("@autumnsgrove/lattice/platform/threshold/worker"),
		]);
		const clientIp = getClientIP(event.request);
		// Authenticated users: rate limit per user ID so limits follow sessions, not IPs.
		// Anonymous: rate limit per IP.
		const identifier = event.locals.user?.id ?? clientIp;
		const threshold = createThreshold(event.platform?.env, { identifier });
		if (threshold) {
			const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method);
			const denied = await thresholdCheck(threshold, {
				key: isWrite ? "api:write" : "api:read",
				limit: isWrite ? 30 : 120,
				windowSeconds: 60,
			});
			if (denied) return denied;
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
	// Internal service requests (worker-to-worker via service binding) are not
	// subject to CSRF — they never traverse a browser. Skip validation entirely.
	if (
		!event.locals.isInternalService &&
		["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)
	) {
		const isAuthEndpoint = event.url.pathname.includes("/auth/");
		// Turnstile verification is like auth - new visitors don't have CSRF tokens
		const isTurnstileEndpoint = event.url.pathname === "/api/verify/turnstile";
		// Admin API endpoints use their own auth gate (isAdmin check) — origin validation suffices
		const isAdminApi = event.url.pathname.startsWith("/api/admin/");
		// SvelteKit form actions have built-in CSRF protection via origin validation
		// Detect via: x-sveltekit-action header OR ?/ URL pattern
		const isSvelteKitAction = event.request.headers.get("x-sveltekit-action") === "true";
		const isFormActionUrl = event.url.search.startsWith("?/");
		const isFormAction = isSvelteKitAction || isFormActionUrl;

		// Get the CSRF token from the request header for fallback validation
		const requestCsrfToken =
			event.request.headers.get("x-csrf-token") || event.request.headers.get("csrf-token");

		// All form actions and auth endpoints use origin-based validation
		// (proxy-aware: checks Origin against X-Forwarded-Host, not just Host)
		// SvelteKit's built-in CSRF is disabled because it doesn't understand
		// our grove-router proxy setup (compares Origin against internal Host).
		// SECURITY: When Origin is absent, falls back to CSRF token validation
		if (isFormAction || isAuthEndpoint || isTurnstileEndpoint || isAdminApi) {
			if (
				!validateCSRF(event.request, false, {
					csrfToken: requestCsrfToken,
					expectedToken: csrfToken,
				})
			) {
				throwGroveError(403, SITE_ERRORS.INVALID_ORIGIN, "Site");
			}
		} else {
			// API routes: CSRF token primary, origin validation fallback.
			// This allows bare fetch() calls (which send Origin but not X-CSRF-Token)
			// to pass via the same origin validation used for form actions.
			// SECURITY: validateCSRF() is fail-closed — no Origin + no token = reject.
			if (!validateCSRFToken(event.request, csrfToken)) {
				if (
					!validateCSRF(event.request, false, {
						csrfToken: requestCsrfToken,
						expectedToken: csrfToken,
					})
				) {
					throwGroveError(403, SITE_ERRORS.INVALID_CSRF_TOKEN, "Site");
				}
				// Dev-mode warning so developers know to migrate to api.*()
				if (event.url.hostname === "localhost" || event.url.hostname === "127.0.0.1") {
					console.warn(
						`[CSRF] Origin-fallback for ${event.request.method} ${event.url.pathname} — use api.*() from @autumnsgrove/lattice/utils/api`,
					);
				}
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
	const needsCsrfCookie = event.locals.user || !cookieHeader?.includes("csrf_token=");
	if (needsCsrfCookie) {
		const isProduction = event.url.hostname !== "localhost" && event.url.hostname !== "127.0.0.1";
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

	// Refresh the demo-mode cookie on every demo-mode request (sliding expiry) —
	// this is what lets clicking around Arbor stay in demo mode after the
	// initial `?demo=` link, without the secret needing to be on every URL.
	if (isDemoModeActive && demoModeSecret) {
		const isProduction = event.url.hostname !== "localhost" && event.url.hostname !== "127.0.0.1";
		const demoCookieParts = [
			`${DEMO_MODE_COOKIE_NAME}=${demoModeSecret}`,
			"Path=/",
			"Max-Age=86400",
			"SameSite=Lax",
			"HttpOnly",
		];
		if (isProduction) demoCookieParts.push("Secure");
		response.headers.append("Set-Cookie", demoCookieParts.join("; "));
	}

	// Refresh the sticky local-tenant cookie whenever this request explicitly
	// named a tenant via ?subdomain= — so the next request (refresh, relative
	// link, Plant's post-signup redirect) keeps simulating it. Never touches
	// production: gated on isLocalhost, and extractSubdomain() only reads
	// this cookie inside its own localhost branch.
	if (isLocalhost) {
		const paramSubdomain = event.url.searchParams.get("subdomain");
		if (paramSubdomain && isValidSubdomain(paramSubdomain)) {
			response.headers.append(
				"Set-Cookie",
				`${LOCAL_SUBDOMAIN_COOKIE_NAME}=${paramSubdomain}; Path=/; Max-Age=86400; SameSite=Lax`,
			);
		}
	}

	setSecurityHeaders(response);

	// Shade Layer 5: AI/TDM opt-out headers
	response.headers.set("X-Robots-Tag", "noai, noimageai");
	// Shade Layer 9: TDMRep — W3C text and data mining rights reservation (EU CDSM Article 4)
	response.headers.set("TDM-Reservation", "1");

	// Content-Security-Policy
	// Nonce-based script-src replaces 'unsafe-inline' for stronger XSS protection.
	// 'unsafe-eval' is only allowed on routes that need Mermaid diagram rendering.
	// challenges.cloudflare.com is required for Turnstile (Shade).
	const hasUnsafeEval = needsUnsafeEval(event.url.pathname);
	const scriptSrc = `'self' 'nonce-${cspNonce}' ${hasUnsafeEval ? "'unsafe-eval' " : ""}https://cdn.jsdelivr.net https://challenges.cloudflare.com`;

	// Exact hostname match on purpose: isLocalhost above is a substring check,
	// which is too loose to gate a security header on.
	const isExactLocalhost = event.url.hostname === "localhost" || event.url.hostname === "127.0.0.1";
	const localImgSrc = isExactLocalhost ? ` ${LOCAL_SEED_IMAGE_HOSTS.join(" ")}` : "";

	const csp = [
		"default-src 'self'",
		"upgrade-insecure-requests",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' https://cdn.grove.place data: blob:${localImgSrc}`,
		"font-src 'self' https://cdn.grove.place",
		"connect-src 'self' https://api.github.com https://grove.place https://*.grove.place https://challenges.cloudflare.com",
		"frame-src https://challenges.cloudflare.com",
		"frame-ancestors 'none'",
	].join("; ");

	response.headers.set("Content-Security-Policy", csp);

	return response;
};

export const handle = sequence(pulseHandle({ app: "aspen" }), aspenHandle, createPulseFlushHook());
export const handleError = createPulseErrorHook({ app: "aspen" });
