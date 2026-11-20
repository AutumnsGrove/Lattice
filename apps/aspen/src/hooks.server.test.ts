/**
 * Aspen hook — the human-check gate runs after the tenant is known (#1734).
 *
 * The Turnstile gate used to run before the tenant lookup, so a subdomain that
 * never existed and one suspended for abuse were both sent to /verify with a 302.
 * Nothing could tell them apart from outside, and neither was a 404.
 *
 * The real hook runs here. The mocks are the edges: the pulse wrappers, the
 * Turnstile cookie check, the session lookup, and a fake D1/TenantDO.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const validateVerificationCookie = vi.fn(async (cookie: string | undefined) => cookie === "human");
const validateGroveSession = vi.fn(async () => null as Response | null);

// SvelteKit's sequence() needs a live request context. This composes the handlers in
// the same order without it; the real aspenHandle is still what runs.
vi.mock("@sveltejs/kit/hooks", () => ({
	sequence:
		(...handlers: any[]) =>
		({ event, resolve }: any) => {
			const apply = (index: number, current: any): any =>
				index === handlers.length
					? resolve(current)
					: handlers[index]({ event: current, resolve: (next: any) => apply(index + 1, next) });
			return apply(0, event);
		},
}));

vi.mock("@autumnsgrove/lattice/pulse", () => ({
	pulseHandle:
		() =>
		async ({ event, resolve }: any) =>
			resolve(event),
	createPulseFlushHook:
		() =>
		async ({ event, resolve }: any) =>
			resolve(event),
	createPulseErrorHook: () => () => {},
}));

vi.mock("@autumnsgrove/lattice/server/services/turnstile", () => ({
	TURNSTILE_COOKIE_NAME: "grove_verified",
	validateVerificationCookie: (cookie: string | undefined) => validateVerificationCookie(cookie),
}));

vi.mock("@autumnsgrove/lattice/server", async () => {
	const actual = await vi.importActual<typeof import("@autumnsgrove/lattice/server")>(
		"@autumnsgrove/lattice/server",
	);
	return { ...actual, validateGroveSession: () => validateGroveSession() };
});

vi.mock("@autumnsgrove/lattice/server/services/users", () => ({
	getUserByTenantId: vi.fn(async () => null),
}));

// Import after mocks
import { handle } from "./hooks.server";

// =============================================================================
// FAKE ENVIRONMENT
// =============================================================================

interface World {
	/** subdomain -> active flag */
	tenants?: Record<string, boolean>;
	/** old subdomain -> new subdomain, for the 30-day rename hold */
	renamed?: Record<string, string>;
}

/** Records the order things were asked of the platform, so the tests can read it back. */
function createWorld({ tenants = {}, renamed = {} }: World = {}) {
	const calls: string[] = [];

	const db = {
		prepare: (sql: string) => ({
			bind: (subdomain: string) => ({
				first: async () => {
					if (sql.includes("FROM tenants")) {
						calls.push(`tenant-lookup:${subdomain}`);
						// The real query filters on `active = 1`; honour it so a suspended row is invisible.
						const active = sql.includes("active = 1");
						const isActive = tenants[subdomain] === true;
						const exists = subdomain in tenants;
						if (!exists || (active && !isActive)) return null;
						return {
							id: `id-${subdomain}`,
							subdomain,
							display_name: subdomain,
							email: `${subdomain}@example.com`,
							theme: null,
							plan: "seedling",
							created_at: 1_700_000_000,
						};
					}
					if (sql.includes("FROM username_history")) {
						calls.push(`rename-lookup:${subdomain}`);
						return subdomain in renamed ? { new_subdomain: renamed[subdomain] } : null;
					}
					return null;
				},
			}),
		}),
	};

	// TenantDO with a cold cache: not ok, so the hook falls through to D1.
	const TENANTS = {
		idFromName: (name: string) => name,
		get: () => ({ fetch: async () => new Response("cold", { status: 404 }) }),
	};

	// AUTH must exist, or the hook never starts a session lookup and the "no session lookup" tests guard nothing.
	return {
		calls,
		platform: { env: { DB: db, TENANTS, AUTH: {}, TURNSTILE_SECRET_KEY: "secret" } },
	};
}

function createEvent(
	world: ReturnType<typeof createWorld>,
	{
		host,
		path = "/",
		cookie,
		userAgent,
	}: { host: string; path?: string; cookie?: string; userAgent?: string },
) {
	const url = new URL(`https://${host}${path}`);
	const headers: Record<string, string> = { host };
	if (cookie) headers.cookie = cookie;
	if (userAgent) headers["user-agent"] = userAgent;
	return {
		url,
		request: new Request(url, { headers }),
		platform: world.platform,
		locals: {} as Record<string, unknown>,
	};
}

const HTML = { "content-type": "text/html; charset=utf-8", "x-from": "resolve" };

function createResolve(
	init: { body?: string; status?: number; headers?: Record<string, string> } = {},
) {
	return vi.fn(
		async () =>
			new Response(init.body ?? "<html><body>page</body></html>", {
				status: init.status ?? 200,
				headers: init.headers ?? HTML,
			}),
	);
}

async function run(
	world: ReturnType<typeof createWorld>,
	request: Parameters<typeof createEvent>[1],
	resolve = createResolve(),
) {
	const event = createEvent(world, request);
	const response = await (handle as any)({ event, resolve });
	return { response: response as Response, resolve, event };
}

/** What a thrown SvelteKit redirect looks like. */
const redirectTo = (location: string, status = 302) => ({ status, location });

const HUMAN = "grove_verified=human";

beforeEach(() => {
	vi.clearAllMocks();
});

// =============================================================================
// The order: tenant first, then the gate
// =============================================================================

describe("a subdomain with no active tenant", () => {
	it("is a 404 with no redirect, for a subdomain that never existed", async () => {
		const world = createWorld();

		const { response } = await run(world, { host: "zzznotarealtenant12345.grove.place" });

		expect(response.status).toBe(404);
		expect(response.headers.get("location")).toBeNull();
	});

	it("is a 404 with no redirect, for a suspended tenant", async () => {
		const world = createWorld({ tenants: { "deletion-fixture": false } });

		const { response } = await run(world, { host: "deletion-fixture.grove.place" });

		expect(response.status).toBe(404);
		expect(response.headers.get("location")).toBeNull();
	});

	it("is indistinguishable whether it never existed or was suspended", async () => {
		const world = createWorld({ tenants: { suspended: false } });

		const never = await run(world, { host: "never.grove.place" });
		const suspended = await run(world, { host: "suspended.grove.place" });

		expect(suspended.response.status).toBe(never.response.status);
		expect(suspended.response.headers.get("location")).toBe(never.response.headers.get("location"));
	});

	it("is still a 404 for a visitor who has passed the human check", async () => {
		const world = createWorld();

		const { response } = await run(world, { host: "nobody.grove.place", cookie: HUMAN });

		expect(response.status).toBe(404);
	});

	it("is a 404 on any page, not just the front door", async () => {
		const world = createWorld();

		const { response } = await run(world, { host: "nobody.grove.place", path: "/garden/hello" });

		expect(response.status).toBe(404);
	});

	it("still renders the not-found page, so a person sees why", async () => {
		const world = createWorld();
		const resolve = createResolve({ body: "<html>Garden Not Found</html>" });

		const { response } = await run(world, { host: "nobody.grove.place" }, resolve);

		expect(resolve).toHaveBeenCalledOnce();
		expect(await response.text()).toContain("Garden Not Found");
	});

	it("never starts a session lookup for an unverified visitor", async () => {
		const world = createWorld();

		await run(world, { host: "nobody.grove.place", cookie: "grove_session=abc" });

		expect(validateGroveSession).not.toHaveBeenCalled();
	});
});

describe("a subdomain with an active tenant", () => {
	const world = () => createWorld({ tenants: { autumn: true } });

	it("still redirects to /verify without the human-check cookie", async () => {
		await expect(run(world(), { host: "autumn.grove.place" })).rejects.toMatchObject(
			redirectTo("/verify?return=%2F"),
		);
	});

	it("keeps the page and query in the return address", async () => {
		await expect(
			run(world(), { host: "autumn.grove.place", path: "/garden/hello?ref=x" }),
		).rejects.toMatchObject(redirectTo("/verify?return=%2Fgarden%2Fhello%3Fref%3Dx"));
	});

	it("serves the page once the visitor has passed the check", async () => {
		const { response, resolve } = await run(world(), { host: "autumn.grove.place", cookie: HUMAN });

		expect(resolve).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
	});

	it("does not start a session lookup for a visitor it is about to challenge", async () => {
		await expect(
			run(world(), { host: "autumn.grove.place", cookie: "grove_session=abc" }),
		).rejects.toBeTruthy();

		expect(validateGroveSession).not.toHaveBeenCalled();
	});

	it("does start the session lookup for a verified visitor with a session", async () => {
		await run(world(), { host: "autumn.grove.place", cookie: `${HUMAN}; grove_session=abc` });

		// Verified visitors are still authenticated, in parallel with the tenant lookup.
		expect(validateGroveSession).toHaveBeenCalledOnce();
	});
});

describe("the order is pinned", () => {
	it("looks the tenant up before it challenges", async () => {
		const world = createWorld({ tenants: { autumn: true } });

		await expect(run(world, { host: "autumn.grove.place" })).rejects.toMatchObject({
			status: 302,
		});

		// If the gate were back in front, the redirect would be thrown before this ran.
		expect(world.calls).toContain("tenant-lookup:autumn");
	});

	it("never reaches the page renderer for a challenged visitor", async () => {
		const world = createWorld({ tenants: { autumn: true } });
		const resolve = createResolve();

		await expect(run(world, { host: "autumn.grove.place" }, resolve)).rejects.toBeTruthy();

		expect(resolve).not.toHaveBeenCalled();
	});
});

// =============================================================================
// What the gate still protects, and what it still lets through
// =============================================================================

describe("the gate is otherwise unchanged", () => {
	it("still challenges the landing site", async () => {
		await expect(run(createWorld(), { host: "grove.place" })).rejects.toMatchObject(
			redirectTo("/verify?return=%2F"),
		);
	});

	it.each([
		"/verify",
		"/api/settings",
		"/auth/callback",
		"/robots.txt",
		"/.well-known/security.txt",
	])("still lets %s through without the cookie, on an active tenant", async (path) => {
		const world = createWorld({ tenants: { autumn: true } });

		const { resolve } = await run(world, { host: "autumn.grove.place", path });

		expect(resolve).toHaveBeenCalledOnce();
	});

	it("still lets a link-preview crawler read an active tenant's page", async () => {
		const world = createWorld({ tenants: { autumn: true } });

		const { resolve } = await run(world, {
			host: "autumn.grove.place",
			userAgent: "Discordbot/2.0",
		});

		expect(resolve).toHaveBeenCalledOnce();
	});

	it("does not challenge at all when Turnstile is not configured", async () => {
		const world = createWorld({ tenants: { autumn: true } });
		(world.platform.env as Record<string, unknown>).TURNSTILE_SECRET_KEY = undefined;

		const { resolve } = await run(world, { host: "autumn.grove.place" });

		expect(resolve).toHaveBeenCalledOnce();
	});

	it("still redirects a renamed subdomain to its new home, without a challenge", async () => {
		const world = createWorld({ tenants: { newname: true }, renamed: { oldname: "newname" } });

		await expect(
			run(world, { host: "oldname.grove.place", path: "/garden" }),
		).rejects.toMatchObject(redirectTo("https://newname.grove.place/garden"));
	});

	it("sends www to the landing site with a 301, not a challenge", async () => {
		const { response } = await run(createWorld(), { host: "www.grove.place", path: "/about" });

		expect(response.status).toBe(301);
		expect(response.headers.get("location")).toBe("https://grove.place/about");
	});
});

// =============================================================================
// The 404 only touches what it should
// =============================================================================

describe("the not-found status", () => {
	const unknown = { host: "nobody.grove.place" };

	it("keeps the page's headers and the hook's own security headers", async () => {
		const { response } = await run(createWorld(), unknown);

		expect(response.status).toBe(404);
		expect(response.headers.get("x-from")).toBe("resolve");
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("content-security-policy")).toContain("default-src");
		expect(response.headers.get("tdm-reservation")).toBe("1");
		expect(response.headers.get("set-cookie")).toContain("csrf_token=");
	});

	it("leaves a JSON response from an API route alone", async () => {
		const resolve = createResolve({
			body: "{}",
			headers: { "content-type": "application/json" },
		});

		const { response } = await run(createWorld(), { ...unknown, path: "/api/settings" }, resolve);

		expect(response.status).toBe(200);
	});

	it("leaves an error the page already chose alone", async () => {
		const resolve = createResolve({ status: 500 });

		const { response } = await run(createWorld(), unknown, resolve);

		expect(response.status).toBe(500);
	});

	it("does not turn a real tenant's pages into 404s", async () => {
		const world = createWorld({ tenants: { autumn: true } });

		const { response } = await run(world, { host: "autumn.grove.place", cookie: HUMAN });

		expect(response.status).toBe(200);
	});
});
