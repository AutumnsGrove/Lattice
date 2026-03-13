/**
 * Engine Hook Pipeline Integration Tests
 *
 * Unlike the existing hook test files (which test utilities in isolation),
 * these tests import the ACTUAL `handle` function from hooks.server.ts and
 * run the full middleware pipeline: redirects → Turnstile → auth → subdomain
 * routing → tenant lookup → body validation → rate limiting → CSRF → resolve
 * → security headers.
 *
 * This catches integration bugs that isolated tests miss — middleware ordering,
 * tenant isolation failures, auth bypass paths, header omissions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect, error } from "@sveltejs/kit";

// ============================================================================
// Mocks — external boundaries only
// ============================================================================

// CSRF utilities — mock at boundary, test orchestration
vi.mock("$lib/utils/csrf.js", () => ({
	generateCSRFToken: vi.fn(() => "mock-csrf-token-uuid"),
	generateSessionCSRFToken: vi.fn(async () => "mock-session-csrf-hmac"),
	validateCSRFToken: vi.fn(() => true),
	validateCSRF: vi.fn(() => true),
}));

// Turnstile — always pass unless explicitly configured
vi.mock("$lib/server/services/turnstile.js", () => ({
	TURNSTILE_COOKIE_NAME: "cf_turnstile",
	validateVerificationCookie: vi.fn(async () => true),
}));

// Tiers config
vi.mock("$lib/config/tiers.js", () => ({
	TIERS: {
		seedling: {
			limits: { posts: 50, storage: 1073741824 },
			features: { customDomain: false },
		},
		sapling: {
			limits: { posts: 100, storage: 5368709120 },
			features: { customDomain: true },
		},
		evergreen: {
			limits: { posts: Infinity, storage: 107374182400 },
			features: { customDomain: true },
		},
	},
}));

// Errors — let throwGroveError actually throw so we can catch it
vi.mock("$lib/errors", async () => {
	const { error } = await import("@sveltejs/kit");
	return {
		SITE_ERRORS: {
			INVALID_ORIGIN: {
				code: "GROVE-SITE-020",
				category: "user",
				userMessage: "Request failed for security reasons.",
			},
			INVALID_CSRF_TOKEN: {
				code: "GROVE-SITE-021",
				category: "user",
				userMessage: "Request failed for security reasons. Please refresh.",
			},
		},
		throwGroveError: vi.fn((status: number, groveError: { code: string; userMessage: string }) => {
			throw error(status, { message: groveError.userMessage, code: groveError.code } as any);
		}),
		logGroveError: vi.fn(),
	};
});

// Threshold (rate limiting) — mock the dynamic imports
vi.mock("$lib/threshold/factory.js", () => ({
	createThreshold: vi.fn(() => null), // disabled by default
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
	thresholdCheck: vi.fn(async () => null), // not denied
}));

vi.mock("$lib/threshold/adapters/worker.js", () => ({
	getClientIP: vi.fn(() => "203.0.113.42"),
}));

// ============================================================================
// Import the actual handle function
// ============================================================================

const { handle } = await import("../../../src/hooks.server.js");

// ============================================================================
// Helpers
// ============================================================================

/** SvelteKit Redirect shape (thrown by redirect()) */
interface SvelteKitRedirect {
	status: number;
	location: string;
}

/** SvelteKit HttpError shape (thrown by error()) */
interface SvelteKitHttpError {
	status: number;
	body: { message: string };
}

function isSvelteKitRedirect(e: unknown): e is SvelteKitRedirect {
	return typeof e === "object" && e !== null && "status" in e && "location" in e;
}

function isSvelteKitHttpError(e: unknown): e is SvelteKitHttpError {
	return typeof e === "object" && e !== null && "status" in e && "body" in e;
}

/**
 * Create a mock event for the handle pipeline.
 *
 * Uses raw object + Headers (not `new Request()`) because the Fetch spec
 * strips forbidden headers (Host, Cookie, Origin) from Request objects.
 */
function createPipelineEvent(options: {
	method?: string;
	pathname?: string;
	search?: string;
	host?: string;
	forwardedHost?: string;
	headers?: Record<string, string>;
	cookies?: Record<string, string>;
	platform?: {
		env?: Record<string, unknown>;
	};
}) {
	const method = options.method ?? "GET";
	const host = options.host ?? "grove.place";
	const pathname = options.pathname ?? "/";
	const search = options.search ?? "";
	const url = new URL(`https://${host}${pathname}${search}`);

	const headers = new Headers();
	headers.set("host", host);

	if (options.forwardedHost) {
		headers.set("x-forwarded-host", options.forwardedHost);
	}

	// Set cookies
	if (options.cookies && Object.keys(options.cookies).length > 0) {
		headers.set(
			"cookie",
			Object.entries(options.cookies)
				.map(([k, v]) => `${k}=${v}`)
				.join("; "),
		);
	}

	// Set extra headers
	for (const [key, value] of Object.entries(options.headers ?? {})) {
		headers.set(key, value);
	}

	const request = {
		method,
		url: url.toString(),
		headers,
	} as unknown as Request;

	return {
		request,
		url,
		locals: {
			user: null,
			context: { type: "landing" },
			csrfToken: null as string | null,
			tenantId: null as string | null,
			isInternalService: false,
		},
		platform: {
			env: {
				DB: createMockDB(),
				AUTH: undefined as unknown,
				TENANTS: undefined as unknown,
				TURNSTILE_SECRET_KEY: undefined as string | undefined,
				CSRF_SECRET: undefined as string | undefined,
				INTERNAL_SERVICE_KEY: undefined as string | undefined,
				...options.platform?.env,
			},
		},
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(() => []),
			serialize: vi.fn(() => ""),
		},
		getClientAddress: vi.fn(() => "127.0.0.1"),
		isDataRequest: false,
		isSubRequest: false,
		route: { id: pathname },
		setHeaders: vi.fn(),
		fetch: vi.fn(),
	};
}

/** Simple mock resolve — returns a plain 200 Response */
function createMockResolve() {
	return vi.fn(
		async (
			_event: unknown,
			opts?: { transformPageChunk?: (input: { html: string; done: boolean }) => string },
		) => {
			let html = "<html><head><script>boot()</script></head><body>OK</body></html>";
			if (opts?.transformPageChunk) {
				html = opts.transformPageChunk({ html, done: true });
			}
			return new Response(html, {
				status: 200,
				headers: new Headers({ "content-type": "text/html" }),
			});
		},
	);
}

/** Mock D1 database that returns null by default */
function createMockDB() {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return this;
			}),
			first: vi.fn(async () => null),
			all: vi.fn(async () => ({ results: [] })),
			run: vi.fn(async () => ({ success: true })),
		})),
	};
}

/** Mock TenantDO namespace that returns tenant config */
function createMockTenants(tenantConfig?: Record<string, unknown>) {
	const config = tenantConfig ?? {
		id: "tenant-uuid-123",
		subdomain: "autumn",
		displayName: "Autumn's Grove",
		theme: null,
		tier: "seedling",
		ownerId: "owner@grove.place",
		limits: { postsPerMonth: 50, storageBytes: 1073741824, customDomains: 0 },
	};

	return {
		idFromName: vi.fn((name: string) => ({ name })),
		get: vi.fn(() => ({
			fetch: vi.fn(
				async () =>
					new Response(JSON.stringify(config), {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			),
		})),
	};
}

/** Mock AUTH service binding */
function createMockAuth(response?: { valid: boolean; user?: Record<string, unknown> }) {
	const resp = response ?? { valid: false };
	return {
		fetch: vi.fn(
			async () =>
				new Response(JSON.stringify(resp), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		),
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("Engine Hook Pipeline (handle)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================================================
	// Terminology Redirects
	// ========================================================================
	describe("Terminology Redirects", () => {
		it("/blog → /garden (301)", async () => {
			const event = createPipelineEvent({ pathname: "/blog" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				expect(isSvelteKitRedirect(e)).toBe(true);
				if (isSvelteKitRedirect(e)) {
					expect(e.status).toBe(301);
					expect(e.location).toBe("/garden");
				}
			}
		});

		it("/blog/my-post → /garden/my-post (301)", async () => {
			const event = createPipelineEvent({ pathname: "/blog/my-post" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				expect(isSvelteKitRedirect(e)).toBe(true);
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/garden/my-post");
				}
			}
		});

		it("/blog preserves query params", async () => {
			const event = createPipelineEvent({ pathname: "/blog", search: "?page=2" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/garden?page=2");
				}
			}
		});

		it("/admin → /arbor (301)", async () => {
			const event = createPipelineEvent({ pathname: "/admin" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.status).toBe(301);
					expect(e.location).toBe("/arbor");
				}
			}
		});

		it("/admin/blog → /arbor/garden (combined migration)", async () => {
			const event = createPipelineEvent({ pathname: "/admin/blog" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/arbor/garden");
				}
			}
		});

		it("/admin/blog/edit/my-post → /arbor/garden/edit/my-post", async () => {
			const event = createPipelineEvent({ pathname: "/admin/blog/edit/my-post" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/arbor/garden/edit/my-post");
				}
			}
		});

		it("/arbor/comments → /arbor/reeds (301)", async () => {
			const event = createPipelineEvent({ pathname: "/arbor/comments" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/arbor/reeds");
				}
			}
		});

		it("/api/blooms/my-post/comments → /api/reeds/my-post (301)", async () => {
			const event = createPipelineEvent({ pathname: "/api/blooms/my-post/comments" });
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/api/reeds/my-post");
				}
			}
		});

		it("/api/blooms/my-post/comments/abc/moderate → /api/reeds/my-post/abc/moderate", async () => {
			const event = createPipelineEvent({
				pathname: "/api/blooms/my-post/comments/abc/moderate",
			});
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.location).toBe("/api/reeds/my-post/abc/moderate");
				}
			}
		});
	});

	// ========================================================================
	// Subdomain Routing
	// ========================================================================
	describe("Subdomain Routing", () => {
		it("no subdomain → landing context", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({ type: "landing" });
		});

		it('"grove" subdomain → landing context', async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				forwardedHost: "grove.grove.place",
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({ type: "landing" });
		});

		it("www → 301 redirect to root", async () => {
			const event = createPipelineEvent({
				host: "www.grove.place",
				pathname: "/about",
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.status).toBe(301);
			expect(response.headers.get("Location")).toBe("https://grove.place/about");
		});

		it("auth → app context with /auth prefix", async () => {
			const event = createPipelineEvent({ host: "auth.grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "app",
				app: "auth",
				routePrefix: "/auth",
			});
		});

		it("admin → app context with /arbor prefix (legacy mapping)", async () => {
			const event = createPipelineEvent({ host: "admin.grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "app",
				app: "admin",
				routePrefix: "/arbor",
			});
		});

		it("arbor → app context with /arbor prefix", async () => {
			const event = createPipelineEvent({ host: "arbor.grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "app",
				app: "arbor",
				routePrefix: "/arbor",
			});
		});

		it("cdn → 404 (handled externally)", async () => {
			const event = createPipelineEvent({ host: "cdn.grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.status).toBe(404);
			expect(resolve).not.toHaveBeenCalled();
		});

		it("staging → 404 (handled externally)", async () => {
			const event = createPipelineEvent({ host: "staging.grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.status).toBe(404);
		});

		it("external workers (scout, music, search) → 404", async () => {
			for (const worker of ["scout", "music", "search"]) {
				const event = createPipelineEvent({ host: `${worker}.grove.place` });
				const resolve = createMockResolve();

				const response = await handle({ event: event as any, resolve });
				expect(response.status).toBe(404);
			}
		});

		it("domains → app context with /(apps)/domains prefix", async () => {
			const event = createPipelineEvent({ host: "domains.grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "app",
				app: "domains",
				routePrefix: "/(apps)/domains",
			});
		});
	});

	// ========================================================================
	// Tenant Lookup
	// ========================================================================
	describe("Tenant Lookup", () => {
		it("valid tenant via TenantDO → tenant context", async () => {
			const event = createPipelineEvent({
				host: "autumn.grove.place",
				platform: {
					env: {
						TENANTS: createMockTenants(),
					},
				},
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "tenant",
				tenant: expect.objectContaining({
					id: "tenant-uuid-123",
					subdomain: "autumn",
					name: "Autumn's Grove",
					plan: "seedling",
				}),
			});
			expect(event.locals.tenantId).toBe("tenant-uuid-123");
		});

		it("unknown subdomain → not_found context", async () => {
			const tenants = createMockTenants();
			// TenantDO returns 404
			tenants.get = vi.fn(() => ({
				fetch: vi.fn(async () => new Response("Not found", { status: 404 })),
			}));

			const event = createPipelineEvent({
				host: "nonexistent.grove.place",
				platform: { env: { TENANTS: tenants } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "not_found",
				subdomain: "nonexistent",
			});
		});

		it("invalid subdomain format rejected before DB lookup", async () => {
			const tenants = createMockTenants();

			const event = createPipelineEvent({
				host: "INVALID_sub.grove.place",
				platform: { env: { TENANTS: tenants } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			// TenantDO should never be called for invalid format
			expect(tenants.idFromName).not.toHaveBeenCalled();
			expect(event.locals.context).toEqual({
				type: "not_found",
				subdomain: "INVALID_sub", // extractSubdomain returns lowercased? No — it returns raw
			});
		});

		it("TenantDO failure falls back to D1", async () => {
			const tenants = createMockTenants();
			tenants.get = vi.fn(() => ({
				fetch: vi.fn(async () => {
					throw new Error("DO unavailable");
				}),
			}));

			// D1 returns a valid tenant
			const db = createMockDB();
			const prepareResult = {
				bind: vi.fn(function (this: any) {
					return this;
				}),
				first: vi.fn(async () => ({
					id: "d1-tenant-id",
					subdomain: "autumn",
					display_name: "Autumn (D1)",
					email: "owner@test.com",
					theme: null,
					plan: "seedling",
				})),
				all: vi.fn(async () => ({ results: [] })),
				run: vi.fn(async () => ({ success: true })),
			};
			db.prepare = vi.fn(() => prepareResult);

			const event = createPipelineEvent({
				host: "autumn.grove.place",
				platform: { env: { TENANTS: tenants, DB: db } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "tenant",
				tenant: expect.objectContaining({
					id: "d1-tenant-id",
					subdomain: "autumn",
					name: "Autumn (D1)",
				}),
			});
		});

		it("username redirect: old subdomain → 302 to new", async () => {
			const tenants = createMockTenants();
			// Tenant not found
			tenants.get = vi.fn(() => ({
				fetch: vi.fn(async () => new Response("Not found", { status: 404 })),
			}));

			// D1: no tenant, but username_history has a redirect
			const db = createMockDB();
			let callCount = 0;
			const prepareResult = {
				bind: vi.fn(function (this: any) {
					return this;
				}),
				first: vi.fn(async () => {
					callCount++;
					// First call is tenant lookup (returns null)
					// Second call is username redirect (returns new_subdomain)
					if (callCount <= 1) return null;
					return { new_subdomain: "newname" };
				}),
				all: vi.fn(async () => ({ results: [] })),
				run: vi.fn(async () => ({ success: true })),
			};
			db.prepare = vi.fn(() => prepareResult);

			const event = createPipelineEvent({
				host: "oldname.grove.place",
				pathname: "/about",
				platform: { env: { TENANTS: tenants, DB: db } },
			});
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				expect(isSvelteKitRedirect(e)).toBe(true);
				if (isSvelteKitRedirect(e)) {
					expect(e.status).toBe(302); // NOT 301 — hold expires
					expect(e.location).toBe("https://newname.grove.place/about");
				}
			}
		});
	});

	// ========================================================================
	// Authentication
	// ========================================================================
	describe("Authentication", () => {
		it("grove_session → SessionDO validation → user populated", async () => {
			const auth = createMockAuth({
				valid: true,
				user: {
					id: "user-123",
					email: "autumn@grove.place",
					name: "Autumn",
					avatarUrl: "https://cdn.grove.place/avatar.jpg",
					isAdmin: false,
				},
			});

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { grove_session: "valid-session-token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toEqual({
				id: "user-123",
				email: "autumn@grove.place",
				name: "Autumn",
				picture: "https://cdn.grove.place/avatar.jpg", // mapped from avatarUrl
				isAdmin: false,
			});
		});

		it("better-auth session cookie also triggers SessionDO", async () => {
			const auth = createMockAuth({
				valid: true,
				user: {
					id: "ba-user",
					email: "ba@grove.place",
					name: "BA User",
					avatarUrl: "https://cdn.grove.place/ba.jpg",
					isAdmin: false,
				},
			});

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { "better-auth.session_token": "ba-token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(auth.fetch).toHaveBeenCalled();
			expect(event.locals.user).toEqual(expect.objectContaining({ id: "ba-user" }));
		});

		it("no session cookies → user stays null", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toBeNull();
		});

		it("invalid session → user stays null", async () => {
			const auth = createMockAuth({ valid: false });

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { grove_session: "invalid-token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toBeNull();
		});

		it("SessionDO crash → user stays null (no 500)", async () => {
			const auth = {
				fetch: vi.fn(async () => {
					throw new Error("DO unavailable");
				}),
			};

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { grove_session: "some-token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			// Should NOT crash — error caught, user stays null
			expect(response.status).toBe(200);
			expect(event.locals.user).toBeNull();
		});

		it("SessionDO response with malformed user → user stays null", async () => {
			const auth = createMockAuth({
				valid: true,
				user: {
					id: "user-123",
					// Missing required fields: email, name, avatarUrl, isAdmin
				},
			});

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { grove_session: "token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toBeNull();
		});

		it("access_token fallback when no session cookie", async () => {
			const auth = createMockAuth(); // Will respond to session validation
			// Override: make AUTH respond to /userinfo
			auth.fetch = vi.fn(async (url: string) => {
				if (url.includes("/userinfo")) {
					return new Response(
						JSON.stringify({
							sub: "jwt-user",
							email: "jwt@grove.place",
							name: "JWT User",
							picture: "https://cdn.grove.place/jwt.jpg",
							provider: "google",
						}),
						{ status: 200 },
					);
				}
				// Session validation returns invalid (no session cookie sent)
				return new Response(JSON.stringify({ valid: false }), { status: 200 });
			});

			const event = createPipelineEvent({
				host: "grove.place",
				cookies: { access_token: "eyJhbGc.jwt.token" },
				platform: { env: { AUTH: auth } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toEqual({
				id: "jwt-user",
				email: "jwt@grove.place",
				name: "JWT User",
				picture: "https://cdn.grove.place/jwt.jpg",
				provider: "google",
			});
		});

		it("internal service auth via HMAC key", async () => {
			const serviceKey = "test-internal-service-key-12345";

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/api/something",
				headers: {
					"X-Internal-Service-Key": serviceKey,
					"X-Tenant-Id": "tenant-abc",
					"x-csrf-token": "mock-csrf-token-uuid", // pass CSRF
				},
				platform: { env: { INTERNAL_SERVICE_KEY: serviceKey } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toEqual(
				expect.objectContaining({
					id: "system:reverie-exec",
					email: "system@grove.internal",
				}),
			);
			expect(event.locals.tenantId).toBe("tenant-abc");
			expect(event.locals.isInternalService).toBe(true);
		});

		it("internal service auth with wrong key → user stays null", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/api/something",
				headers: {
					"X-Internal-Service-Key": "wrong-key",
					"X-Tenant-Id": "tenant-abc",
					"x-csrf-token": "mock-csrf-token-uuid",
				},
				platform: { env: { INTERNAL_SERVICE_KEY: "correct-key" } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.user).toBeNull();
			expect(event.locals.isInternalService).toBeFalsy();
		});
	});

	// ========================================================================
	// Turnstile Verification
	// ========================================================================
	describe("Turnstile Verification", () => {
		it("skips verification for API routes", async () => {
			const { validateVerificationCookie } = await import("$lib/server/services/turnstile.js");

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/api/posts",
				platform: { env: { TURNSTILE_SECRET_KEY: "turnstile-secret" } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(validateVerificationCookie).not.toHaveBeenCalled();
		});

		it("skips verification for auth routes", async () => {
			const { validateVerificationCookie } = await import("$lib/server/services/turnstile.js");

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/auth/callback",
				platform: { env: { TURNSTILE_SECRET_KEY: "secret" } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(validateVerificationCookie).not.toHaveBeenCalled();
		});

		it("redirects to /verify when Turnstile fails on content page", async () => {
			const { validateVerificationCookie } = await import("$lib/server/services/turnstile.js");
			(validateVerificationCookie as any).mockResolvedValueOnce(false);

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/about",
				platform: { env: { TURNSTILE_SECRET_KEY: "secret" } },
			});
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown redirect");
			} catch (e) {
				if (isSvelteKitRedirect(e)) {
					expect(e.status).toBe(302);
					expect(e.location).toContain("/verify");
					expect(e.location).toContain("return=%2Fabout");
				}
			}
		});

		it("passes when Turnstile not configured (no secret key)", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/about",
				// No TURNSTILE_SECRET_KEY
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});
	});

	// ========================================================================
	// Request Body Size Validation
	// ========================================================================
	describe("Request Body Size Validation", () => {
		it("rejects oversized JSON body → 413", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/posts",
				headers: {
					"content-type": "application/json",
					"content-length": String(2 * 1024 * 1024), // 2MB
					"x-csrf-token": "mock-csrf-token-uuid",
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.status).toBe(413);
			const body = await response.json();
			expect(body.error).toBe("payload_too_large");
		});

		it("allows JSON body under 1MB", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/posts",
				headers: {
					"content-type": "application/json",
					"content-length": "500",
					"x-csrf-token": "mock-csrf-token-uuid",
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});

		it("allows large multipart body (file uploads exempt)", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/images/upload",
				headers: {
					"content-type": "multipart/form-data; boundary=----",
					"content-length": String(10 * 1024 * 1024), // 10MB
					"x-csrf-token": "mock-csrf-token-uuid",
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			// Should NOT be 413 — multipart is exempt
			expect(response.status).not.toBe(413);
		});

		it("does not validate GET requests regardless of content-length", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "GET",
				pathname: "/api/posts",
				headers: {
					"content-length": String(5 * 1024 * 1024),
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});
	});

	// ========================================================================
	// CSRF Protection (via the actual pipeline)
	// ========================================================================
	describe("CSRF Protection", () => {
		it("skips CSRF for GET requests", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "GET",
				pathname: "/api/posts",
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});

		it("internal service requests skip CSRF", async () => {
			const serviceKey = "internal-key";
			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/reverie/execute",
				headers: {
					"X-Internal-Service-Key": serviceKey,
					"X-Tenant-Id": "tenant-1",
					// NO x-csrf-token header
				},
				platform: { env: { INTERNAL_SERVICE_KEY: serviceKey } },
			});
			const resolve = createMockResolve();

			// Should NOT throw CSRF error
			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});

		it("POST without CSRF token → rejects (when validateCSRFToken returns false)", async () => {
			const { validateCSRFToken, validateCSRF } = await import("$lib/utils/csrf.js");
			(validateCSRFToken as any).mockReturnValueOnce(false);
			(validateCSRF as any).mockReturnValueOnce(false);

			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/posts",
			});
			const resolve = createMockResolve();

			try {
				await handle({ event: event as any, resolve });
				expect.unreachable("should have thrown error");
			} catch (e) {
				expect(isSvelteKitHttpError(e)).toBe(true);
				if (isSvelteKitHttpError(e)) {
					expect(e.status).toBe(403);
				}
			}
		});

		it("form action with valid origin passes CSRF", async () => {
			const { validateCSRF } = await import("$lib/utils/csrf.js");
			(validateCSRF as any).mockReturnValue(true);

			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/settings",
				search: "?/save",
				headers: {
					origin: "https://grove.place",
					"x-forwarded-host": "grove.place",
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			expect(response.status).toBe(200);
		});
	});

	// ========================================================================
	// Security Headers
	// ========================================================================
	describe("Security Headers", () => {
		it("sets all required security headers on response", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.headers.get("X-Frame-Options")).toBe("DENY");
			expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
			expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
			expect(response.headers.get("Permissions-Policy")).toContain("geolocation=()");
			expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
			expect(response.headers.get("Strict-Transport-Security")).toContain("includeSubDomains");
			expect(response.headers.get("Strict-Transport-Security")).toContain("preload");
		});

		it("sets AI opt-out headers (Shade Layer 5 & 9)", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.headers.get("X-Robots-Tag")).toBe("noai, noimageai");
			expect(response.headers.get("TDM-Reservation")).toBe("1");
		});

		it("CSP includes nonce-based script-src", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const csp = response.headers.get("Content-Security-Policy")!;
			expect(csp).toContain("script-src");
			expect(csp).toMatch(/'nonce-[a-f0-9]+'/);
			expect(csp).toContain("https://challenges.cloudflare.com");
			expect(csp).toContain("https://cdn.jsdelivr.net");
		});

		it("CSP includes unsafe-eval for /arbor/ routes", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/arbor/settings",
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const csp = response.headers.get("Content-Security-Policy")!;
			expect(csp).toContain("'unsafe-eval'");
		});

		it("CSP does NOT include unsafe-eval for API routes", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/api/posts",
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const csp = response.headers.get("Content-Security-Policy")!;
			expect(csp).not.toContain("'unsafe-eval'");
		});

		it("CSP frame-ancestors 'none' prevents clickjacking", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const csp = response.headers.get("Content-Security-Policy")!;
			expect(csp).toContain("frame-ancestors 'none'");
		});

		it("injects nonce into script tags via transformPageChunk", async () => {
			const event = createPipelineEvent({ host: "grove.place" });
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });
			const html = await response.text();

			// Script tags should have nonce attributes
			expect(html).toMatch(/<script nonce="[a-f0-9]+"/);
			// Should NOT have bare <script> without nonce
			expect(html).not.toMatch(/<script>/);
		});
	});

	// ========================================================================
	// CSRF Cookie Management
	// ========================================================================
	describe("CSRF Cookie", () => {
		it("sets CSRF cookie on response when missing from request", async () => {
			const event = createPipelineEvent({
				host: "autumn.grove.place",
				// No cookies — CSRF will be generated
				platform: { env: { TENANTS: createMockTenants() } },
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const setCookie = response.headers.get("Set-Cookie");
			expect(setCookie).toContain("csrf_token=");
			expect(setCookie).toContain("Path=/");
			expect(setCookie).toContain("SameSite=Lax");
		});

		it("sets Secure flag in production (not localhost)", async () => {
			const event = createPipelineEvent({
				host: "autumn.grove.place",
				platform: { env: { TENANTS: createMockTenants() } },
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const setCookie = response.headers.get("Set-Cookie");
			expect(setCookie).toContain("Secure");
		});

		it("CSRF cookie does NOT include Domain (prevents cross-tenant sharing)", async () => {
			const event = createPipelineEvent({
				host: "autumn.grove.place",
				platform: { env: { TENANTS: createMockTenants() } },
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			const setCookie = response.headers.get("Set-Cookie");
			// SECURITY: No Domain attribute — cookie scoped to exact subdomain
			expect(setCookie).not.toContain("Domain=");
		});
	});

	// ========================================================================
	// Rate Limiting
	// ========================================================================
	describe("Rate Limiting", () => {
		it("rate limiting only applies to /api/ routes", async () => {
			const { createThreshold } = await import("$lib/threshold/factory.js");

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/about",
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(createThreshold).not.toHaveBeenCalled();
		});

		it("rate limit denial returns the denial response", async () => {
			const { createThreshold } = await import("$lib/threshold/factory.js");
			const { thresholdCheck } = await import("$lib/threshold/adapters/sveltekit.js");

			const mockThreshold = { check: vi.fn() };
			(createThreshold as any).mockReturnValueOnce(mockThreshold);
			(thresholdCheck as any).mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }),
			);

			const event = createPipelineEvent({
				host: "grove.place",
				pathname: "/api/posts",
				method: "POST",
				headers: { "x-csrf-token": "mock-csrf-token-uuid" },
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			expect(response.status).toBe(429);
		});
	});

	// ========================================================================
	// Local Development
	// ========================================================================
	describe("Local Development", () => {
		it("x-subdomain header simulates tenant on localhost", async () => {
			const event = createPipelineEvent({
				host: "localhost:5173",
				headers: { "x-subdomain": "autumn" },
				platform: { env: { TENANTS: createMockTenants() } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "tenant",
				tenant: expect.objectContaining({ subdomain: "autumn" }),
			});
		});

		it("rejects invalid x-subdomain to prevent injection", async () => {
			const event = createPipelineEvent({
				host: "localhost:5173",
				headers: { "x-subdomain": "'; DROP TABLE tenants;--" },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			// Should not look up the malicious subdomain — treat as landing
			expect(event.locals.context).toEqual({ type: "landing" });
		});

		it("subdomain query param works on localhost", async () => {
			const event = createPipelineEvent({
				host: "localhost:5173",
				search: "?subdomain=autumn",
				platform: { env: { TENANTS: createMockTenants() } },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			expect(event.locals.context).toEqual({
				type: "tenant",
				tenant: expect.objectContaining({ subdomain: "autumn" }),
			});
		});

		it("x-subdomain header ignored on production", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				headers: { "x-subdomain": "attacker" },
			});
			const resolve = createMockResolve();

			await handle({ event: event as any, resolve });

			// Should be landing, NOT tenant — x-subdomain ignored in production
			expect(event.locals.context).toEqual({ type: "landing" });
		});
	});

	// ========================================================================
	// Full Pipeline Integration
	// ========================================================================
	describe("Full Pipeline Integration", () => {
		it("authenticated tenant request → full pipeline", async () => {
			const auth = createMockAuth({
				valid: true,
				user: {
					id: "user-123",
					email: "autumn@grove.place",
					name: "Autumn",
					avatarUrl: "https://cdn.grove.place/avatar.jpg",
					isAdmin: true,
				},
			});

			const event = createPipelineEvent({
				host: "autumn.grove.place",
				pathname: "/arbor/garden",
				cookies: { grove_session: "valid-session" },
				platform: {
					env: {
						AUTH: auth,
						TENANTS: createMockTenants(),
					},
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			// Auth populated
			expect(event.locals.user).toEqual(expect.objectContaining({ id: "user-123", isAdmin: true }));

			// Tenant context set
			expect(event.locals.context).toEqual({
				type: "tenant",
				tenant: expect.objectContaining({ subdomain: "autumn" }),
			});

			// Security headers present
			expect(response.headers.get("X-Frame-Options")).toBe("DENY");
			expect(response.headers.get("Content-Security-Policy")).toContain("'unsafe-eval'"); // arbor route

			// CSP nonce injected
			const html = await response.text();
			expect(html).toMatch(/<script nonce="/);
		});

		it("unauthenticated API POST → all middleware runs in order", async () => {
			const event = createPipelineEvent({
				host: "grove.place",
				method: "POST",
				pathname: "/api/posts",
				headers: {
					"content-type": "application/json",
					"content-length": "100",
					"x-csrf-token": "mock-csrf-token-uuid",
				},
			});
			const resolve = createMockResolve();

			const response = await handle({ event: event as any, resolve });

			// No auth
			expect(event.locals.user).toBeNull();
			// Landing context (no subdomain)
			expect(event.locals.context).toEqual({ type: "landing" });
			// Response returned with headers
			expect(response.status).toBe(200);
			expect(response.headers.get("X-Frame-Options")).toBe("DENY");
		});
	});
});
