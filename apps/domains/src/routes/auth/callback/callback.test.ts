import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./+server";

// Mock @sveltejs/kit
vi.mock("@sveltejs/kit", () => ({
	redirect: (status: number, location: string) => {
		const err = new Error(`Redirect to ${location}`) as any;
		err.status = status;
		err.location = location;
		throw err;
	},
	error: (status: number, message: string) => {
		const err = new Error(message) as any;
		err.status = status;
		throw err;
	},
}));

// Mock $lib/server/db
vi.mock("$lib/server/db", () => ({
	getOrCreateUser: vi.fn().mockResolvedValue({
		id: "user-1",
		email: "test@test.com",
		is_admin: false,
	}),
	createSession: vi.fn().mockResolvedValue({ id: "sess-1" }),
}));

import * as dbModule from "$lib/server/db";

// Helper to create mock event
function makeEvent(
	options: {
		searchParams?: Record<string, string>;
		cookies?: Record<string, string>;
		env?: any;
	} = {},
) {
	const url = new URL("http://localhost:5174/auth/callback");
	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
	}

	const cookieStore: Record<string, string> = { ...options.cookies };
	const defaultEnv = { DB: {} };

	return {
		url,
		cookies: {
			get: vi.fn((name: string) => cookieStore[name]),
			set: vi.fn((name: string, value: string) => {
				cookieStore[name] = value;
			}),
			delete: vi.fn(),
		},
		platform: { env: { ...defaultEnv, ...options.env } },
	} as any;
}

describe("GET /auth/callback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers(); // Reset to real timers by default
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("throws 500 when DB not available", async () => {
		const event = makeEvent({ env: { DB: null } });

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.message).toContain("Database not available");
		}
	});

	it("redirects with error message when OAuth error param present", async () => {
		const event = makeEvent({
			searchParams: { error: "invalid_scope" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("Authentication failed"));
		}
	});

	it("redirects with access_denied message when error=access_denied", async () => {
		const event = makeEvent({
			searchParams: { error: "access_denied" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("You cancelled the login process"));
		}
	});

	it("redirects with no_session when no cookies at all", async () => {
		const event = makeEvent({
			searchParams: {},
			cookies: {},
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("Session was not created"));
		}
	});

	it("redirects to returnTo with legacy session within migration window", async () => {
		// Set the time BEFORE the deadline (2026-03-01)
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-28T00:00:00Z"));

		const event = makeEvent({
			searchParams: { returnTo: "/arbor/my-sites" },
			cookies: { access_token: "legacy-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toBe("/arbor/my-sites");
		}

		vi.useRealTimers();
	});

	it("redirects with no_session when legacy session expired (after deadline)", async () => {
		// Deadline is 2026-03-01, today is 2026-03-12 (past deadline)
		const event = makeEvent({
			searchParams: {},
			cookies: { access_token: "legacy-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("Session was not created"));
		}
	});

	it("successfully creates session with valid Better Auth session cookie", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					user: {
						id: "oauth-user-id",
						email: "user@example.com",
						name: "Test User",
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			searchParams: { returnTo: "/arbor" },
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown redirect");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toBe("/arbor");

			// Verify fetch was called
			expect(fetchMock).toHaveBeenCalledWith("https://login.grove.place/api/auth/session", {
				headers: {
					Cookie: "better-auth.session_token=valid-token",
				},
			});

			// Verify user creation
			expect(dbModule.getOrCreateUser).toHaveBeenCalledWith(
				event.platform.env.DB,
				"user@example.com",
			);

			// Verify session creation
			expect(dbModule.createSession).toHaveBeenCalledWith(event.platform.env.DB, "user-1");

			// Verify cookie was set
			expect(event.cookies.set).toHaveBeenCalledWith(
				"session",
				"sess-1",
				expect.objectContaining({
					path: "/",
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					maxAge: 60 * 60 * 24 * 30,
				}),
			);
		}

		vi.unstubAllGlobals();
	});

	it("uses __Secure- prefixed cookie for Better Auth in production", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					user: {
						email: "user@example.com",
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			searchParams: { returnTo: "/arbor" },
			cookies: { "__Secure-better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown redirect");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toBe("/arbor");

			// Verify fetch uses the cookie
			expect(fetchMock).toHaveBeenCalledWith("https://login.grove.place/api/auth/session", {
				headers: {
					Cookie: "better-auth.session_token=valid-token",
				},
			});
		}

		vi.unstubAllGlobals();
	});

	it("sets local session cookie on success", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					user: {
						email: "user@example.com",
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown redirect");
		} catch (err: any) {
			expect(event.cookies.set).toHaveBeenCalledWith("session", "sess-1", expect.any(Object));
		}

		vi.unstubAllGlobals();
	});

	it("redirects with userinfo_failed when session response has no email", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					user: {
						id: "user-id",
						// Missing email
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(
				encodeURIComponent("Unable to retrieve your account information"),
			);
		}

		vi.unstubAllGlobals();
	});

	it("redirects with userinfo_failed when session response is empty", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain(
				encodeURIComponent("Unable to retrieve your account information"),
			);
		}

		vi.unstubAllGlobals();
	});

	it("redirects with network_error on fetch TypeError", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network error"));

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(
				encodeURIComponent("Unable to connect to authentication service, please try again"),
			);
		}

		vi.unstubAllGlobals();
	});

	it("redirects with network_error on fetch timeout", async () => {
		const error = new Error("Fetch timeout");
		error.message = "fetch failed";
		const fetchMock = vi.fn().mockRejectedValue(error);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(
				encodeURIComponent("Unable to connect to authentication service, please try again"),
			);
		}

		vi.unstubAllGlobals();
	});

	it("redirects with auth_failed when session endpoint returns non-ok status", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: "invalid session" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("Authentication failed, please try again"));
		}

		vi.unstubAllGlobals();
	});

	it("redirects with auth_failed on generic error", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("Unknown error"));

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toContain("/arbor/login");
			expect(err.location).toContain(encodeURIComponent("Authentication failed, please try again"));
		}

		vi.unstubAllGlobals();
	});

	it("defaults returnTo to /arbor when not provided", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					user: {
						email: "user@example.com",
					},
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);

		vi.stubGlobal("fetch", fetchMock);

		const event = makeEvent({
			searchParams: {}, // No returnTo
			cookies: { "better-auth.session_token": "valid-token" },
		});

		try {
			await GET(event);
			expect.fail("Should have thrown redirect");
		} catch (err: any) {
			expect(err.status).toBe(302);
			expect(err.location).toBe("/arbor");
		}

		vi.unstubAllGlobals();
	});
});
