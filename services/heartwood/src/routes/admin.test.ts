/**
 * Integration tests for admin routes
 * Tests GET /admin/stats, /admin/users, /admin/audit-log, /admin/clients
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
	getAdminStats: vi.fn(),
	getAllUsers: vi.fn(),
	getAuditLogs: vi.fn(),
	getAllClients: vi.fn(),
	checkRateLimit: vi.fn(),
	// cookieAuth dependencies
	isUserAdmin: vi.fn(),
	isUserBanned: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({
		prepare: vi.fn().mockReturnValue({
			run: vi.fn().mockResolvedValue({
				meta: { served_by_region: "WNAM", served_by_primary: false },
			}),
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null),
				all: vi.fn().mockResolvedValue({ results: [] }),
				run: vi.fn().mockResolvedValue({ success: true }),
			}),
			first: vi.fn().mockResolvedValue(null),
		}),
	}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../middleware/rateLimit.js")>();
	return {
		...actual,
		adminRateLimiter: vi
			.fn()
			.mockImplementation(async (_c: unknown, next: () => Promise<void>) => next()),
		checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
	};
});

// Mock JWT verification (a dependency of the REAL adminCookieAuth below —
// unlike the previous version of this file, adminCookieAuth itself is not
// mocked, so these tests exercise the actual auth-gating logic).
vi.mock("../services/jwt.js", () => ({
	verifyAccessToken: vi.fn(),
}));

import adminRoutes from "./admin.js";
import {
	getAdminStats,
	getAllUsers,
	getAuditLogs,
	getAllClients,
	isUserAdmin,
	isUserBanned,
} from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/admin", adminRoutes);
	return app;
}

const mockEnv = createMockEnv();

const ADMIN_TOKEN_PAYLOAD = {
	sub: "admin-user-1",
	client_id: "test",
	iss: "https://auth.grove.place",
	iat: 1000000000,
	exp: 1000003600,
};

function adminHeaders() {
	return { Authorization: "Bearer valid-admin-token" };
}

beforeEach(() => {
	vi.clearAllMocks();
	// Default: authenticated as a verified admin, via the Bearer path —
	// individual tests override this to exercise the other outcomes.
	vi.mocked(verifyAccessToken).mockResolvedValue(ADMIN_TOKEN_PAYLOAD);
	vi.mocked(isUserAdmin).mockResolvedValue(true);
	vi.mocked(isUserBanned).mockResolvedValue(false);
});

// =============================================================================
// Admin auth gate (previously entirely mocked away — no test asserted a
// non-admin or anonymous caller was actually rejected by this router)
// =============================================================================

describe("admin auth gate", () => {
	it("returns 401 with no Authorization header and no cookies", async () => {
		const app = createApp();
		const res = await app.request("/admin/users", { method: "GET" }, mockEnv);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.error).toBe("unauthorized");
		expect(getAllUsers).not.toHaveBeenCalled();
	});

	it("returns 401 for an invalid/expired Bearer token", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			"/admin/users",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(401);
		const json: any = (await res.json()) as any;
		expect(json.error).toBe("invalid_token");
	});

	it("returns 403 for a valid token belonging to a non-admin user", async () => {
		vi.mocked(isUserAdmin).mockResolvedValue(false);

		const app = createApp();
		const res = await app.request(
			"/admin/users",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(403);
		const json: any = (await res.json()) as any;
		expect(json.error).toBe("forbidden");
		expect(getAllUsers).not.toHaveBeenCalled();
	});

	it("allows a verified admin through", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		expect(isUserAdmin).toHaveBeenCalledWith(expect.anything(), ADMIN_TOKEN_PAYLOAD.sub);
	});

	it("gates a route registered after the middleware just as strictly (catch-all applies to the whole router)", async () => {
		vi.mocked(isUserAdmin).mockResolvedValue(false);

		const app = createApp();
		// /admin/clients is registered last in admin.ts — if the catch-all
		// middleware were somehow route-order-sensitive, this is the route
		// that would slip through first.
		const res = await app.request(
			"/admin/clients",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(403);
		expect(getAllClients).not.toHaveBeenCalled();
	});
});

// =============================================================================
// GET /admin/stats
// =============================================================================

describe("GET /admin/stats", () => {
	it("returns dashboard statistics", async () => {
		const mockStats = {
			total_users: 42,
			users_by_provider: { google: 42 },
			users_by_tier: { seedling: 20, sapling: 15, evergreen: 7 },
			recent_logins: [],
			total_clients: 3,
			email_signups_count: 5,
		};
		vi.mocked(getAdminStats).mockResolvedValue(mockStats);

		const app = createApp();
		const res = await app.request(
			"/admin/stats",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.total_users).toBe(42);
		expect(json.total_clients).toBe(3);
		expect(json.replication).toBeDefined();
	});

	it("includes replication metadata", async () => {
		vi.mocked(getAdminStats).mockResolvedValue({
			total_users: 0,
			users_by_provider: {},
			users_by_tier: {},
			recent_logins: [],
			total_clients: 0,
			email_signups_count: 0,
		});

		const app = createApp();
		const res = await app.request(
			"/admin/stats",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.replication).toHaveProperty("served_by_region");
		expect(json.replication).toHaveProperty("served_by_primary");
	});

	it("returns a structured 500 (not a bare unhandled error) when the stats query fails", async () => {
		vi.mocked(getAdminStats).mockRejectedValue(new Error("DB connection failed"));

		const app = createApp();
		const res = await app.request(
			"/admin/stats",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(500);
		const json: any = (await res.json()) as any;
		expect(json.error).toBe("stats_failed");
	});
});

// =============================================================================
// GET /admin/users
// =============================================================================

describe("GET /admin/users", () => {
	it("returns user list with default pagination", async () => {
		const mockUsers = [
			{ id: "u1", email: "a@grove.place", name: "Alice" },
			{ id: "u2", email: "b@grove.place", name: "Bob" },
		];
		vi.mocked(getAllUsers).mockResolvedValue(mockUsers as any);

		const app = createApp();
		const res = await app.request(
			"/admin/users",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.users).toHaveLength(2);
		expect(json.pagination.limit).toBe(50); // ADMIN_PAGINATION_DEFAULT_LIMIT
		expect(json.pagination.offset).toBe(0);
	});

	it("strips fields not on the explicit allowlist, even ones that don't exist yet", async () => {
		// Regression test: the route used to return `SELECT *` verbatim.
		// This asserts a hypothetical future-sensitive column (a TOTP
		// secret, here) does NOT reach the client just because it exists on
		// the row the query layer returned.
		vi.mocked(getAllUsers).mockResolvedValue([
			{
				id: "u1",
				email: "a@grove.place",
				name: "Alice",
				avatar_url: null,
				provider: "google",
				provider_id: "google-id-123",
				is_admin: 0,
				created_at: "2025-01-01",
				last_login: null,
				theme: null,
				grove_mode: null,
				season: null,
				totp_secret: "should-never-leave-the-server",
			},
		] as any);

		const app = createApp();
		const res = await app.request(
			"/admin/users",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		const json: any = (await res.json()) as any;
		expect(json.users[0].totp_secret).toBeUndefined();
		expect(json.users[0].provider_id).toBeUndefined();
		expect(json.users[0].email).toBe("a@grove.place");
	});

	it("respects limit and offset query params", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?limit=10&offset=20",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(10);
		expect(json.pagination.offset).toBe(20);
		expect(vi.mocked(getAllUsers)).toHaveBeenCalledWith(expect.anything(), 10, 20);
	});

	it("clamps limit to max of 100", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?limit=500",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(100); // ADMIN_PAGINATION_MAX_LIMIT
	});

	it("clamps limit minimum to 1", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?limit=-5",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(1);
	});

	it("clamps negative offset to 0", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?offset=-10",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.offset).toBe(0);
	});

	it("falls back to the default limit for a non-numeric limit, instead of letting NaN reach the query unbounded", async () => {
		// Regression test: parseInt("abc") -> NaN, and Math.max/min propagate
		// NaN rather than clamping it — the previous bounds check silently
		// let a non-numeric limit through, and D1/SQLite treats a NaN-bound
		// LIMIT as unbounded, dumping the entire users table.
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?limit=abc",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(50);
		expect(vi.mocked(getAllUsers)).toHaveBeenCalledWith(expect.anything(), 50, 0);
	});

	it("falls back to offset 0 for a non-numeric offset", async () => {
		vi.mocked(getAllUsers).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/users?offset=xyz",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.offset).toBe(0);
	});
});

// =============================================================================
// GET /admin/audit-log
// =============================================================================

describe("GET /admin/audit-log", () => {
	it("returns audit logs with default pagination", async () => {
		const mockLogs = [{ id: "log1", event_type: "login", user_id: "u1" }];
		vi.mocked(getAuditLogs).mockResolvedValue(mockLogs as any);

		const app = createApp();
		const res = await app.request(
			"/admin/audit-log",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.logs).toHaveLength(1);
		expect(json.pagination.limit).toBe(50);
		expect(json.pagination.offset).toBe(0);
	});

	it("passes event_type filter to query", async () => {
		vi.mocked(getAuditLogs).mockResolvedValue([]);

		const app = createApp();
		await app.request(
			"/admin/audit-log?event_type=login",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(vi.mocked(getAuditLogs)).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ eventType: "login" }),
		);
	});

	it("handles pagination params", async () => {
		vi.mocked(getAuditLogs).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/audit-log?limit=25&offset=50",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(25);
		expect(json.pagination.offset).toBe(50);
	});

	it("clamps oversized limit", async () => {
		vi.mocked(getAuditLogs).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/audit-log?limit=999",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(100);
	});

	it("falls back to the default limit for a non-numeric limit", async () => {
		vi.mocked(getAuditLogs).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/audit-log?limit=not-a-number",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination.limit).toBe(50);
	});
});

// =============================================================================
// GET /admin/clients
// =============================================================================

describe("GET /admin/clients", () => {
	it("returns clients with sensitive fields stripped", async () => {
		const mockClients = [
			{
				id: "c1",
				name: "Test App",
				client_id: "test-app",
				client_secret_hash: "super-secret-hash-should-not-appear",
				domain: "example.com",
				redirect_uris: JSON.stringify(["https://example.com/callback"]),
				allowed_origins: JSON.stringify(["https://example.com"]),
				is_internal_service: 0,
				created_at: "2025-01-01",
				updated_at: "2025-01-01",
			},
		];
		vi.mocked(getAllClients).mockResolvedValue(mockClients as any);

		const app = createApp();
		const res = await app.request(
			"/admin/clients",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.clients).toHaveLength(1);

		const client = json.clients[0];
		// Should include safe fields
		expect(client.id).toBe("c1");
		expect(client.name).toBe("Test App");
		expect(client.client_id).toBe("test-app");
		expect(client.domain).toBe("example.com");
		expect(client.redirect_uris).toEqual(["https://example.com/callback"]);
		expect(client.allowed_origins).toEqual(["https://example.com"]);

		// Should NOT include sensitive fields
		expect(client.client_secret_hash).toBeUndefined();
		expect(client.is_internal_service).toBeUndefined();
		expect(client.updated_at).toBeUndefined();
	});

	it("returns empty array when no clients exist", async () => {
		vi.mocked(getAllClients).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/clients",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.clients).toEqual([]);
	});

	it("parses JSON string fields into arrays", async () => {
		vi.mocked(getAllClients).mockResolvedValue([
			{
				id: "c1",
				name: "Multi",
				client_id: "multi",
				client_secret_hash: "hash",
				domain: null,
				redirect_uris: JSON.stringify(["https://a.com/cb", "https://b.com/cb"]),
				allowed_origins: JSON.stringify(["https://a.com", "https://b.com"]),
				is_internal_service: 1,
				created_at: "2025-01-01",
				updated_at: "2025-01-01",
			},
		] as any);

		const app = createApp();
		const res = await app.request(
			"/admin/clients",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		const json: any = (await res.json()) as any;
		expect(json.clients[0].redirect_uris).toBeInstanceOf(Array);
		expect(json.clients[0].redirect_uris).toHaveLength(2);
	});

	it("is paginated like the other list endpoints", async () => {
		vi.mocked(getAllClients).mockResolvedValue([]);

		const app = createApp();
		const res = await app.request(
			"/admin/clients?limit=5&offset=10",
			{ method: "GET", headers: adminHeaders() },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json: any = (await res.json()) as any;
		expect(json.pagination).toEqual({ limit: 5, offset: 10 });
		expect(vi.mocked(getAllClients)).toHaveBeenCalledWith(expect.anything(), 5, 10);
	});
});
