/**
 * Integration tests for Better Auth routes
 * Tests request routing and error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock the auth module
vi.mock("../auth/index.js", () => ({
	createAuth: vi.fn(() => ({
		handler: vi.fn(),
	})),
}));

// Mock database queries
vi.mock("../db/queries.js", () => ({
	createAuditLog: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock security middleware
vi.mock("../middleware/security.js", () => ({
	getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
	getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

// Mock rate limiters - middleware that calls next()
vi.mock("../middleware/rateLimit.js", () => ({}));

// Mock the session bridge — real database hooks never fire in these tests
// since createAuth() itself is mocked to a bare handler, so bridge state
// must be controlled directly per test.
vi.mock("../lib/sessionBridge.js", () => ({
	registerRequestForBridge: vi.fn(),
	getSessionBridgeResult: vi.fn(),
	cleanupRequestContext: vi.fn(),
	redactId: vi.fn((id: string) => `redacted:${id}`),
}));

// Keep the real cookie-building/clearing implementations (deterministic,
// no external deps) but mock the request-parsing side so tests can control
// which grove_session, if any, a request is carrying.
vi.mock("../lib/session.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../lib/session.js")>();
	return {
		...actual,
		getSessionFromRequest: vi.fn(),
	};
});

import betterAuthRoutes from "./betterAuth.js";
import { createAuth } from "../auth/index.js";
import {
	getSessionBridgeResult,
	cleanupRequestContext as mockCleanupRequestContext,
} from "../lib/sessionBridge.js";
import { getSessionFromRequest } from "../lib/session.js";
import { CLOUDFLARE_WORKER_CLIENT_IP } from "@autumnsgrove/lattice/server";

// Type-safe response interfaces for tests
interface ErrorResponse {
	error: string;
	message?: string;
	debug?: string;
}

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/api/auth", betterAuthRoutes);
	return app;
}

const mockEnv = createMockEnv();

// Helper to create mock Better Auth handler
function mockAuthHandler(response: Response) {
	return vi.fn().mockResolvedValue(response);
}

// =============================================================================
// Request Routing
// =============================================================================

describe("Better Auth Handler - request routing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes GET requests to Better Auth", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ session: null })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(mockHandler).toHaveBeenCalled();
		expect(res.status).toBe(200);
	});

	it("routes POST requests to Better Auth", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ success: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request(
			"/api/auth/sign-out",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			mockEnv,
		);

		expect(mockHandler).toHaveBeenCalled();
		expect(res.status).toBe(200);
	});

	it("handles all /api/auth/* paths", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();

		// Test various paths
		const paths = ["/api/auth/session", "/api/auth/sign-in/social", "/api/auth/callback/google"];

		for (const path of paths) {
			mockHandler.mockClear();
			await app.request(path, { method: "GET" }, mockEnv);
			expect(mockHandler).toHaveBeenCalled();
		}
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe("Better Auth Handler - error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 500 on handler error", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("Database connection failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(res.status).toBe(500);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("server_error");
	});

	it("logs errors to console", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const mockHandler = vi.fn().mockRejectedValue(new Error("Test error"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

// =============================================================================
// Sign-out (regression: BA sign-out previously left grove_session live)
// =============================================================================

describe("Better Auth Handler - sign-out", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSessionBridgeResult).mockReturnValue(undefined);
	});

	function extractSetCookies(res: Response): string[] {
		return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
	}

	it("revokes the SessionDO session and clears grove_session on sign-out", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ success: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const revokeSession = vi.fn().mockResolvedValue(true);
		const env = createMockEnv({
			SESSIONS: {
				idFromName: vi.fn().mockReturnValue("do-id"),
				get: vi.fn().mockReturnValue({ revokeSession }),
			} as unknown as Env["SESSIONS"],
		});

		const app = createApp();
		const res = await app.request("/api/auth/sign-out", { method: "POST" }, env);

		expect(revokeSession).toHaveBeenCalledWith("sess-1");
		const setCookies = extractSetCookies(res);
		expect(setCookies.some((c) => c.startsWith("grove_session=;"))).toBe(true);
	});

	it("still clears the grove_session cookie on sign-out even with no active session", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ success: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request("/api/auth/sign-out", { method: "POST" }, mockEnv);

		const setCookies = extractSetCookies(res);
		expect(setCookies.some((c) => c.startsWith("grove_session=;"))).toBe(true);
	});

	it("does not touch grove_session for non-sign-out paths", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ session: null })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(getSessionFromRequest).not.toHaveBeenCalled();
		const setCookies = extractSetCookies(res);
		expect(setCookies.some((c) => c.startsWith("grove_session=;"))).toBe(false);
	});
});

// =============================================================================
// Response caching (per-user auth/session data must never be cached)
// =============================================================================

describe("Better Auth Handler - response headers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSessionBridgeResult).mockReturnValue(undefined);
	});

	it("sets Cache-Control: no-store on responses", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ session: null })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(res.headers.get("Cache-Control")).toBe("no-store");
	});
});

// =============================================================================
// Orphaned session cleanup (regression: throw-after-bridge left a phantom
// SessionDO session with no cookie ever delivered for it)
// =============================================================================

describe("Better Auth Handler - orphaned session cleanup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("revokes the SessionDO session if the bridge succeeded before the handler threw", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("BA serialization failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });
		vi.mocked(getSessionBridgeResult).mockReturnValue({
			sessionId: "sess-orphan",
			userId: "user-1",
		});

		const revokeSession = vi.fn().mockResolvedValue(true);
		const env = createMockEnv({
			SESSIONS: {
				idFromName: vi.fn().mockReturnValue("do-id"),
				get: vi.fn().mockReturnValue({ revokeSession }),
			} as unknown as Env["SESSIONS"],
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, env);

		expect(res.status).toBe(500);
		expect(revokeSession).toHaveBeenCalledWith("sess-orphan");
	});

	it("does not attempt to revoke when the bridge itself failed (no orphan to clean up)", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("BA serialization failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });
		vi.mocked(getSessionBridgeResult).mockReturnValue({
			sessionId: "",
			userId: "user-1",
			error: "Session creation failed",
		});

		const revokeSession = vi.fn().mockResolvedValue(true);
		const env = createMockEnv({
			SESSIONS: {
				idFromName: vi.fn().mockReturnValue("do-id"),
				get: vi.fn().mockReturnValue({ revokeSession }),
			} as unknown as Env["SESSIONS"],
		});

		const app = createApp();
		await app.request("/api/auth/session", { method: "GET" }, env);

		expect(revokeSession).not.toHaveBeenCalled();
	});

	it("always cleans up request context, on both success and error paths", async () => {
		vi.mocked(getSessionBridgeResult).mockReturnValue(undefined);

		const successHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: successHandler });
		const app = createApp();
		await app.request("/api/auth/session", { method: "GET" }, mockEnv);
		expect(mockCleanupRequestContext).toHaveBeenCalledTimes(1);

		vi.mocked(mockCleanupRequestContext).mockClear();

		const errorHandler = vi.fn().mockRejectedValue(new Error("boom"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: errorHandler });
		await app.request("/api/auth/session", { method: "GET" }, mockEnv);
		expect(mockCleanupRequestContext).toHaveBeenCalledTimes(1);
	});
});

// =============================================================================
// OAuth callback error redirect host matching (regression: substring match
// on callbackURL could select the wrong error base for a crafted URL)
// =============================================================================

describe("Better Auth Handler - OAuth callback error redirect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSessionBridgeResult).mockReturnValue(undefined);
	});

	it("redirects to plant.grove.place only on an exact hostname match", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("oauth failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		const res = await app.request(
			"/api/auth/callback/google?callbackURL=https%3A%2F%2Fplant.grove.place%2Fdashboard",
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toContain("https://plant.grove.place/login");
	});

	it("does not redirect to plant.grove.place for a lookalike callbackURL substring match", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("oauth failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		const res = await app.request(
			"/api/auth/callback/google?callbackURL=https%3A%2F%2Fevil.com%2F%3Fx%3Dplant.grove.place",
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toContain("https://heartwood.grove.place/login");
	});
});

// =============================================================================
// Client IP at the boundary (#1679)
// =============================================================================

describe("Better Auth handler - client IP", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("hands Better Auth the forwarded client address, not Cloudflare's Worker IP", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		await app.request(
			"/api/auth/sign-in/email-otp",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// What a Worker→Worker subrequest looks like on arrival.
					"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
					// What the login hub forwarded before the hop.
					"x-real-ip": "198.51.100.4",
				},
				body: JSON.stringify({ email: "friend@example.com", otp: "123456" }),
			},
			mockEnv,
		);

		const forwarded = mockHandler.mock.calls[0]?.[0] as Request;
		// Better Auth's own rate limiter and session writer read these headers,
		// so this is what decides whether per-IP limits are per-IP at all.
		expect(forwarded.headers.get("cf-connecting-ip")).toBe("198.51.100.4");
		expect(forwarded.headers.get("x-real-ip")).toBe("198.51.100.4");
	});

	it("strips the Worker IP rather than letting it become a rate-limit key", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		await app.request(
			"/api/auth/sign-in/social",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"cf-connecting-ip": CLOUDFLARE_WORKER_CLIENT_IP,
				},
				body: JSON.stringify({ provider: "google" }),
			},
			mockEnv,
		);

		const forwarded = mockHandler.mock.calls[0]?.[0] as Request;
		expect(forwarded.headers.get("cf-connecting-ip")).toBeNull();
	});

	it("leaves a direct edge request's headers untouched", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({ handler: mockHandler });

		const app = createApp();
		await app.request(
			"/api/auth/session",
			{ method: "GET", headers: { "cf-connecting-ip": "203.0.113.7" } },
			mockEnv,
		);

		const forwarded = mockHandler.mock.calls[0]?.[0] as Request;
		expect(forwarded.headers.get("cf-connecting-ip")).toBe("203.0.113.7");
	});
});
