/**
 * Integration tests for session routes
 * Tests validate, revoke, revoke-all, list, delete, check, validate-service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER } from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
	getSessionByTokenHash: vi.fn(),
	getUserById: vi.fn(),
	getClientByClientId: vi.fn(),
	getUserClientPreference: vi.fn(),
	getUserSubscription: vi.fn().mockResolvedValue(null),
	getTenantByEmail: vi.fn().mockResolvedValue(null),
	isEmailAdmin: vi.fn().mockReturnValue(false),
	checkRateLimit: vi.fn(),
	revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
	revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
	revokeSession: vi.fn().mockResolvedValue(undefined),
	revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../middleware/rateLimit.js")>();
	return {
		...actual,
		checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
	};
});

// Mock JWT verification
vi.mock("../services/jwt.js", () => ({
	verifyAccessToken: vi.fn(),
}));

// Mock only the session-identity functions; keep parseCookieHeader,
// clearAllAuthCookies, and buildClearAuthCookiesHeaders real so cookie
// handling in tests exercises the actual RFC-7230-safe implementation
// instead of a hand-rolled stand-in.
vi.mock("../lib/session.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../lib/session.js")>();
	return {
		...actual,
		getSessionFromRequest: vi.fn(),
		parseSessionCookie: vi.fn(),
	};
});

// Mock Better Auth session functions
vi.mock("../lib/server/session.js", () => ({
	validateSession: vi.fn(),
	invalidateSession: vi.fn(),
	invalidateAllUserSessions: vi.fn(),
}));

// Mock the ban check. It is a second question about the same session (#1719), and
// these tests are about the answer `validate` gives, not about D1.
vi.mock("../lib/server/ban-status.js", () => ({
	isBannedBetterAuthSession: vi.fn().mockResolvedValue(false),
}));

// Mock crypto
vi.mock("../utils/crypto.js", () => ({
	hashSecret: vi.fn().mockResolvedValue("mock-hash"),
	timingSafeEqual: vi.fn(),
}));

import sessionRoutes from "./session.js";
import { isBannedBetterAuthSession } from "../lib/server/ban-status.js";
import {
	getUserById,
	getSessionByTokenHash,
	revokeRefreshToken,
	revokeAllUserTokens,
	revokeSession as revokeDbSession,
	revokeAllUserSessions as revokeAllDbSessions,
} from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { getSessionFromRequest, parseSessionCookie } from "../lib/session.js";
import {
	validateSession as validateBetterAuthSession,
	invalidateSession as invalidateBetterAuthSession,
	invalidateAllUserSessions as invalidateAllBetterAuthSessions,
} from "../lib/server/session.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { timingSafeEqual } from "../utils/crypto.js";

// SessionDO mock
function createMockSessionDO(
	overrides: {
		validateSession?: (id: string) => Promise<{ valid: boolean; session?: unknown }>;
		revokeSession?: (id: string) => Promise<boolean>;
		revokeAllSessions?: (keepId?: string) => Promise<number>;
		listSessions?: () => Promise<unknown[]>;
	} = {},
) {
	return {
		validateSession:
			overrides.validateSession ??
			vi.fn().mockResolvedValue({
				valid: true,
				session: { deviceName: "Chrome", lastActiveAt: Date.now() },
			}),
		revokeSession: overrides.revokeSession ?? vi.fn().mockResolvedValue(true),
		revokeAllSessions: overrides.revokeAllSessions ?? vi.fn().mockResolvedValue(3),
		listSessions:
			overrides.listSessions ??
			vi.fn().mockResolvedValue([
				{
					id: "sess-1",
					deviceName: "Chrome",
					lastActiveAt: Date.now(),
					createdAt: Date.now(),
				},
				{
					id: "sess-2",
					deviceName: "Firefox",
					lastActiveAt: Date.now(),
					createdAt: Date.now(),
				},
			]),
	};
}

function createMockEnvWithSessions(sessionDO = createMockSessionDO()) {
	return createMockEnv({
		SESSIONS: {
			idFromName: vi.fn().mockReturnValue("do-id-123"),
			get: vi.fn().mockReturnValue(sessionDO),
		} as unknown as DurableObjectNamespace,
	});
}

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/session", sessionRoutes);
	return app;
}

beforeEach(() => {
	vi.clearAllMocks();
});

// =============================================================================
// POST /session/validate
// =============================================================================

describe("POST /session/validate", () => {
	it("returns valid: false when no session cookie", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();
		const res = await app.request("/session/validate", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(false);
	});

	it("names a ban instead of leaving the person to guess (#1719)", async () => {
		// The session is not valid — that has not changed — but "invalid" is what
		// produced the sign-in loop: the hub could not tell a banned account from a
		// signed-out browser, so it showed the form again.
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);
		vi.mocked(isBannedBetterAuthSession).mockResolvedValue(true);

		const app = createApp();
		const env = createMockEnvWithSessions();
		const res = await app.request("/session/validate", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(false);
		expect(json.reason).toBe("banned");
	});

	it("says nothing extra for an ordinary invalid session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);
		vi.mocked(isBannedBetterAuthSession).mockResolvedValue(false);

		const app = createApp();
		const env = createMockEnvWithSessions();
		const res = await app.request("/session/validate", { method: "POST" }, env);

		const json: any = (await res.json()) as any;
		expect(json).toEqual({ valid: false });
	});

	it("validates SessionDO session and returns user info", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/validate", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.user.id).toBe("user-test-123");
		expect(json.user.email).toBe("test@grove.place");
		expect(json.user.isAdmin).toBe(false);
		expect(json.session.id).toBe("sess-1");
	});

	it("includes isAdmin flag for admin users", async () => {
		const adminUser = { ...TEST_USER, is_admin: 1 };
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(adminUser as any);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/validate", { method: "POST" }, env);

		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.user.isAdmin).toBe(true);
	});

	it("falls back to JWT access_token cookie", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(verifyAccessToken).mockResolvedValue({
			sub: "user-test-123",
			client_id: "test",
			iss: "test",
			iat: 0,
			exp: 0,
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/validate",
			{
				method: "POST",
				headers: { Cookie: "access_token=valid-jwt-token" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.session).toBeNull(); // No DO session for JWT auth
	});

	it("falls back to Better Auth session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(verifyAccessToken).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue({
			id: "ba-user-1",
			email: "ba@grove.place",
			name: "BA User",
			image: "https://example.com/avatar.jpg",
			isAdmin: false,
			emailVerified: true,
			tenantId: null,
			loginCount: 1,
			banned: false,
			banReason: null,
			banExpires: null,
		});

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/validate", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.user.id).toBe("ba-user-1");
		expect(json.user.email).toBe("ba@grove.place");
	});

	it("returns 429 when rate limited", async () => {
		vi.mocked(checkRouteRateLimit).mockResolvedValue({
			allowed: false,
			remaining: 0,
			retryAfter: 30,
		});

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/validate", { method: "POST" }, env);

		expect(res.status).toBe(429);
		const json: any = (await res.json()) as any;
		expect(json.error).toBe("rate_limit");

		// Reset for other tests
		vi.mocked(checkRouteRateLimit).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
	});

	it("falls back to the legacy D1 session cookie", async () => {
		// This whole authentication fallback previously had zero coverage.
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(verifyAccessToken).mockResolvedValue(null);
		vi.mocked(getSessionByTokenHash).mockResolvedValue({
			id: "legacy-sess-1",
			user_id: "user-test-123",
			client_id: "client-1",
			session_token_hash: "mock-hash",
			last_used_at: "2026-01-01T00:00:00Z",
			expires_at: "2027-01-01T00:00:00Z",
			is_active: 1,
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/validate",
			{ method: "POST", headers: { Cookie: "session=raw-legacy-token" } },
			env,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.user.id).toBe("user-test-123");
		expect(json.session).toBeNull();
	});
});

// =============================================================================
// POST /session/revoke
// =============================================================================

describe("POST /session/revoke", () => {
	it("returns 401 when no session found", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/revoke", { method: "POST" }, env);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.success).toBe(false);
	});

	it("revokes SessionDO session and clears cookies", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/revoke", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.success).toBe(true);
		expect(sessionDO.revokeSession).toHaveBeenCalledWith("sess-1");

		// Each cleared cookie must be its own Set-Cookie header — Set-Cookie
		// can't be comma-joined (RFC 7230 excludes it from list-folding), so
		// getSetCookie() (not a single .get("Set-Cookie")) is the only way to
		// actually verify all five auth cookies were cleared, not just the first.
		const setCookies: string[] = (
			res.headers as unknown as { getSetCookie(): string[] }
		).getSetCookie();
		expect(setCookies).toHaveLength(5);
		expect(
			setCookies.some((c: string) => c.startsWith("grove_session=") && c.includes("Max-Age=0")),
		).toBe(true);
		expect(
			setCookies.some((c: string) => c.startsWith("access_token=") && c.includes("Max-Age=0")),
		).toBe(true);
		expect(
			setCookies.some((c: string) => c.startsWith("refresh_token=") && c.includes("Max-Age=0")),
		).toBe(true);
		expect(
			setCookies.some(
				(c: string) => c.startsWith("better-auth.session_token=") && c.includes("Max-Age=0"),
			),
		).toBe(true);
		expect(
			setCookies.some(
				(c: string) =>
					c.startsWith("__Secure-better-auth.session_token=") && c.includes("Max-Age=0"),
			),
		).toBe(true);
	});

	it("also revokes Better Auth session if present", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(invalidateBetterAuthSession).mockResolvedValue(true);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/revoke",
			{
				method: "POST",
				headers: {
					Cookie: "better-auth.session_token=token123.signature",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(vi.mocked(invalidateBetterAuthSession)).toHaveBeenCalledWith(
			"token123",
			expect.anything(),
		);
	});

	it("revokes the refresh token cookie if present, so it can't renew a stolen access token", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/revoke",
			{
				method: "POST",
				headers: { Cookie: "refresh_token=raw-refresh-token" },
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(vi.mocked(revokeRefreshToken)).toHaveBeenCalledWith(expect.anything(), "mock-hash");
	});

	it("revokes the legacy D1 session if the legacy session cookie is present", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(getSessionByTokenHash).mockResolvedValue({
			id: "legacy-sess-1",
			user_id: "user-test-123",
			client_id: "client-1",
			session_token_hash: "mock-hash",
			last_used_at: "2026-01-01T00:00:00Z",
			expires_at: "2027-01-01T00:00:00Z",
			is_active: 1,
		});

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/revoke",
			{
				method: "POST",
				headers: { Cookie: "session=raw-legacy-token" },
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(vi.mocked(revokeDbSession)).toHaveBeenCalledWith(expect.anything(), "legacy-sess-1");
	});

	it("does not revoke or clear cookies when no auth cookie of any kind is present", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/revoke", { method: "POST" }, env);

		expect(res.status).toBe(401);
		expect(vi.mocked(revokeRefreshToken)).not.toHaveBeenCalled();
		expect(vi.mocked(revokeDbSession)).not.toHaveBeenCalled();
	});
});

// =============================================================================
// POST /session/revoke-all
// =============================================================================

describe("POST /session/revoke-all", () => {
	it("returns 401 when no session found", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/revoke-all", { method: "POST" }, env);

		expect(res.status).toBe(401);
	});

	it("revokes all SessionDO sessions", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request(
			"/session/revoke-all",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			},
			env,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.success).toBe(true);
		expect(json.revokedCount).toBe(3);
		// Called without keepCurrent since keepCurrent=false
		expect(sessionDO.revokeAllSessions).toHaveBeenCalledWith(undefined);
		// "Revoke everywhere" must also close refresh tokens and legacy D1
		// sessions, not just SessionDO/Better Auth.
		expect(vi.mocked(revokeAllUserTokens)).toHaveBeenCalledWith(expect.anything(), "user-test-123");
		expect(vi.mocked(revokeAllDbSessions)).toHaveBeenCalledWith(expect.anything(), "user-test-123");
	});

	it("respects keepCurrent option", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-current",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		await app.request(
			"/session/revoke-all",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keepCurrent: true }),
			},
			env,
		);

		expect(sessionDO.revokeAllSessions).toHaveBeenCalledWith("sess-current");
	});

	it("also revokes Better Auth sessions", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue({
			id: "ba-user-1",
			email: "test@grove.place",
			name: "Test",
			image: null,
			isAdmin: false,
			emailVerified: true,
			tenantId: null,
			loginCount: 1,
			banned: false,
			banReason: null,
			banExpires: null,
		});
		vi.mocked(invalidateAllBetterAuthSessions).mockResolvedValue(true);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/revoke-all", { method: "POST" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.betterAuthRevoked).toBe(true);
	});

	it("surfaces betterAuthKeepCurrentIgnored when keepCurrent is requested but a Better Auth session was also revoked", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(validateBetterAuthSession).mockResolvedValue({
			id: "ba-user-1",
			email: "test@grove.place",
			name: "Test",
			image: null,
			isAdmin: false,
			emailVerified: true,
			tenantId: null,
			loginCount: 1,
			banned: false,
			banReason: null,
			banExpires: null,
		});
		vi.mocked(invalidateAllBetterAuthSessions).mockResolvedValue(true);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/revoke-all",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keepCurrent: true }),
			},
			env,
		);

		const json: any = (await res.json()) as any;
		expect(json.betterAuthKeepCurrentIgnored).toBe(true);
	});
});

// =============================================================================
// GET /session/list
// =============================================================================

describe("GET /session/list", () => {
	it("returns 401 when no session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/list", { method: "GET" }, env);

		expect(res.status).toBe(401);
	});

	it("returns sessions with isCurrent flag", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/list", { method: "GET" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.sessions).toHaveLength(2);

		const current = json.sessions.find((s: any) => s.id === "sess-1");
		const other = json.sessions.find((s: any) => s.id === "sess-2");
		expect(current.isCurrent).toBe(true);
		expect(other.isCurrent).toBe(false);
	});

	it("returns 401 when the cookie decrypts but the session is revoked/expired", async () => {
		// A cookie that decrypts is not proof the session is still active —
		// this is the gate that stops a revoked cookie from still listing
		// every device's IP/user-agent for the account.
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-revoked",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO({
			validateSession: vi.fn().mockResolvedValue({ valid: false }),
		});
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/list", { method: "GET" }, env);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.sessions).toEqual([]);
	});
});

// =============================================================================
// DELETE /session/:sessionId
// =============================================================================

describe("DELETE /session/:sessionId", () => {
	it("returns 401 when no session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/some-id", { method: "DELETE" }, env);

		expect(res.status).toBe(401);
	});

	it("returns 404 when session to revoke not found", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-current",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO({
			revokeSession: vi.fn().mockResolvedValue(false),
		});
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/nonexistent-id", { method: "DELETE" }, env);

		expect(res.status).toBe(404);
	});

	it("successfully revokes a specific session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-current",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/sess-2", { method: "DELETE" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.success).toBe(true);
		expect(sessionDO.revokeSession).toHaveBeenCalledWith("sess-2");
	});

	it("returns 401 when the acting cookie decrypts but its own session is revoked/expired", async () => {
		// Without this gate, a revoked cookie could still be used to log the
		// account out of every other device.
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-revoked",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO({
			validateSession: vi.fn().mockResolvedValue({ valid: false }),
		});
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);

		const res = await app.request("/session/sess-2", { method: "DELETE" }, env);

		expect(res.status).toBe(401);
		expect(sessionDO.revokeSession).not.toHaveBeenCalled();
	});
});

// =============================================================================
// POST /session/validate-service
// =============================================================================

describe("POST /session/validate-service", () => {
	it("returns 401 when SERVICE_SECRET is set but auth header is missing", async () => {
		const app = createApp();
		const env = createMockEnvWithSessions();
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ session_token: "some-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
	});

	it("returns 401 when SERVICE_SECRET doesn't match", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(false);

		const app = createApp();
		const env = createMockEnvWithSessions();
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer wrong-secret",
				},
				body: JSON.stringify({ session_token: "some-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
	});

	it("returns 400 when session_token is missing", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(true);

		const app = createApp();
		const env = createMockEnvWithSessions();
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-secret",
				},
				body: JSON.stringify({}),
			},
			env,
		);

		expect(res.status).toBe(400);
	});

	it("returns 401 when session token signature is invalid", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(true);
		vi.mocked(parseSessionCookie).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-secret",
				},
				body: JSON.stringify({ session_token: "invalid-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.error).toContain("Invalid session token");
	});

	it("returns valid user info for valid service request", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(true);
		vi.mocked(parseSessionCookie).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-secret",
				},
				body: JSON.stringify({ session_token: "valid-signed-token" }),
			},
			env,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(true);
		expect(json.user.id).toBe("user-test-123");
		expect(json.user.email).toBe("test@grove.place");
	});

	it("returns 401 when the session is expired or revoked", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(true);
		vi.mocked(parseSessionCookie).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});

		const sessionDO = createMockSessionDO({
			validateSession: vi.fn().mockResolvedValue({ valid: false }),
		});
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-secret",
				},
				body: JSON.stringify({ session_token: "valid-signed-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.error).toContain("expired or revoked");
	});

	it("returns 401 when the session is valid but the user no longer exists", async () => {
		vi.mocked(timingSafeEqual).mockReturnValue(true);
		vi.mocked(parseSessionCookie).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(null);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);
		env.SERVICE_SECRET = "my-secret";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer my-secret",
				},
				body: JSON.stringify({ session_token: "valid-signed-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.error).toContain("User not found");
	});

	it("fails closed — rejects every request when SERVICE_SECRET is unset", async () => {
		// A missing SERVICE_SECRET must not silently disable auth on an
		// endpoint that returns full user PII for any submitted token —
		// that would turn a misconfigured deploy into a public PII oracle.
		vi.mocked(parseSessionCookie).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

		const sessionDO = createMockSessionDO();
		const app = createApp();
		const env = createMockEnvWithSessions(sessionDO);
		// No SERVICE_SECRET set

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ session_token: "valid-signed-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.valid).toBe(false);
	});

	it("fails closed even when SERVICE_SECRET is an empty string", async () => {
		const app = createApp();
		const env = createMockEnvWithSessions();
		env.SERVICE_SECRET = "";

		const res = await app.request(
			"/session/validate-service",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer ",
				},
				body: JSON.stringify({ session_token: "some-token" }),
			},
			env,
		);

		expect(res.status).toBe(401);
	});
});

// =============================================================================
// GET /session/check (legacy endpoint)
// =============================================================================

describe("GET /session/check", () => {
	it("returns authenticated: false when no session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/check", { method: "GET" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.authenticated).toBe(false);
	});

	it("returns user info from SessionDO session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-test-123",
			signature: "sig",
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request("/session/check", { method: "GET" }, env);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.authenticated).toBe(true);
		expect(json.user.id).toBe("user-test-123");
	});

	it("falls back to the legacy D1 session cookie", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue(null);
		vi.mocked(verifyAccessToken).mockResolvedValue(null);
		vi.mocked(getSessionByTokenHash).mockResolvedValue({
			id: "legacy-sess-1",
			user_id: "user-test-123",
			client_id: "client-1",
			session_token_hash: "mock-hash",
			last_used_at: "2026-01-01T00:00:00Z",
			expires_at: "2027-01-01T00:00:00Z",
			is_active: 1,
		});
		vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

		const app = createApp();
		const env = createMockEnvWithSessions();

		const res = await app.request(
			"/session/check",
			{ method: "GET", headers: { Cookie: "session=raw-legacy-token" } },
			env,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.authenticated).toBe(true);
		expect(json.user.id).toBe("user-test-123");
	});
});
