/**
 * Tests for adminCookieAuth — dual Bearer/cookie admin auth middleware.
 *
 * Covers the #1583 audit finding for this file: none of the three auth
 * paths (Bearer JWT, grove_session → SessionDO, access_token cookie
 * fallback) checked ban status — isUserAdmin only checks is_admin/Wayfinder
 * email, not ba_user.banned. A banned admin's still-valid session/token
 * kept granting admin access. Also regression-tests the Path 3 cookie
 * lookup switch from an unanchored regex to an exact parseCookieHeader key.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

vi.mock("../db/queries.js", () => ({
	isUserAdmin: vi.fn(),
	isUserBanned: vi.fn(),
}));

vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

vi.mock("../services/jwt.js", () => ({
	verifyAccessToken: vi.fn(),
}));

vi.mock("../lib/session.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../lib/session.js")>();
	return {
		...actual,
		getSessionFromRequest: vi.fn(),
	};
});

import { adminCookieAuth } from "./cookieAuth.js";
import { isUserAdmin, isUserBanned } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { getSessionFromRequest } from "../lib/session.js";

interface ErrorResponse {
	error: string;
	error_description?: string;
}

const mockEnv = createMockEnv();

function createApp() {
	const app = new Hono<{ Bindings: Env; Variables: Record<string, unknown> }>();
	app.use("/*", adminCookieAuth());
	app.get("/admin/test", (c) => c.json({ ok: true, accessToken: c.get("accessToken") ?? null }));
	return app;
}

function sessionDoEnv(overrides: { valid?: boolean } = {}) {
	return {
		SESSIONS: {
			idFromName: vi.fn().mockReturnValue("do-id"),
			get: vi.fn().mockReturnValue({
				validateSession: vi.fn().mockResolvedValue({ valid: overrides.valid ?? true }),
			}),
		} as unknown as Env["SESSIONS"],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getSessionFromRequest).mockResolvedValue(null);
});

describe("adminCookieAuth — no credentials", () => {
	it("returns 401 unauthorized when no Bearer, session cookie, or access_token cookie is present", async () => {
		const app = createApp();
		const res = await app.request("/admin/test", {}, mockEnv);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			error: "unauthorized",
			error_description: "Missing or invalid credentials",
		});
	});
});

describe("adminCookieAuth — Path 1: Bearer token", () => {
	it("returns 401 invalid_token when the JWT fails verification", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Authorization: "Bearer bad-token" } },
			mockEnv,
		);

		expect(res.status).toBe(401);
		expect(((await res.json()) as ErrorResponse).error).toBe("invalid_token");
	});

	it("returns 401 unauthorized for a banned admin without ever checking isUserAdmin", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "banned-admin" } as any);
		vi.mocked(isUserBanned).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Authorization: "Bearer good-token" } },
			mockEnv,
		);

		expect(res.status).toBe(401);
		expect(((await res.json()) as ErrorResponse).error).toBe("unauthorized");
		expect(isUserAdmin).not.toHaveBeenCalled();
	});

	it("returns 403 forbidden for a non-banned, non-admin user", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "regular-user" } as any);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(false);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Authorization: "Bearer good-token" } },
			mockEnv,
		);

		expect(res.status).toBe(403);
		expect(((await res.json()) as ErrorResponse).error).toBe("forbidden");
	});

	it("allows a non-banned admin through and exposes the token for downstream proxying", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user" } as any);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Authorization: "Bearer good-token" } },
			mockEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, accessToken: "good-token" });
	});
});

describe("adminCookieAuth — Path 2: grove_session cookie via SessionDO", () => {
	it("returns 401 unauthorized for a banned admin, without calling isUserAdmin", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			userId: "banned-admin",
			sessionId: "sess-1",
		} as any);
		vi.mocked(isUserBanned).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "grove_session=whatever" } },
			{ ...mockEnv, ...sessionDoEnv({ valid: true }) },
		);

		expect(res.status).toBe(401);
		expect(((await res.json()) as ErrorResponse).error).toBe("unauthorized");
		expect(isUserAdmin).not.toHaveBeenCalled();
	});

	it("returns 403 forbidden for a valid, non-banned, non-admin session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			userId: "regular-user",
			sessionId: "sess-2",
		} as any);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(false);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "grove_session=whatever" } },
			{ ...mockEnv, ...sessionDoEnv({ valid: true }) },
		);

		expect(res.status).toBe(403);
	});

	it("allows a valid, non-banned admin session through", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			userId: "admin-user",
			sessionId: "sess-3",
		} as any);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "grove_session=whatever" } },
			{ ...mockEnv, ...sessionDoEnv({ valid: true }) },
		);

		expect(res.status).toBe(200);
	});

	it("falls through to Path 3 when SessionDO reports the session invalid", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			userId: "some-user",
			sessionId: "sess-4",
		} as any);
		vi.mocked(verifyAccessToken).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "grove_session=whatever" } },
			{ ...mockEnv, ...sessionDoEnv({ valid: false }) },
		);

		// Falls through with no access_token cookie either -> final 401,
		// not stuck inside the Path 2 branch.
		expect(res.status).toBe(401);
		expect(isUserBanned).not.toHaveBeenCalled();
	});
});

describe("adminCookieAuth — Path 3: access_token cookie fallback", () => {
	it("returns 401 unauthorized for a banned admin, without calling isUserAdmin", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "banned-admin" } as any);
		vi.mocked(isUserBanned).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "access_token=some-jwt" } },
			mockEnv,
		);

		expect(res.status).toBe(401);
		expect(isUserAdmin).not.toHaveBeenCalled();
	});

	it("allows a valid, non-banned admin through", async () => {
		vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user" } as any);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "access_token=some-jwt" } },
			mockEnv,
		);

		expect(res.status).toBe(200);
	});

	it("regression: exact cookie-name lookup, not a substring regex match", async () => {
		// A cookie named "evil_access_token" used to be matched by the old
		// /access_token=([^;]+)/ regex because it contains "access_token="
		// as a substring. parseCookieHeader's exact key lookup must ignore
		// it and only read the cookie literally named "access_token".
		vi.mocked(verifyAccessToken).mockImplementation(async (_env, token) =>
			token === "real-admin-jwt" ? ({ sub: "admin-user" } as any) : null,
		);
		vi.mocked(isUserBanned).mockResolvedValue(false);
		vi.mocked(isUserAdmin).mockResolvedValue(true);

		const app = createApp();
		const res = await app.request(
			"/admin/test",
			{ headers: { Cookie: "evil_access_token=attacker-jwt; access_token=real-admin-jwt" } },
			mockEnv,
		);

		expect(verifyAccessToken).toHaveBeenCalledWith(expect.anything(), "real-admin-jwt");
		expect(res.status).toBe(200);
	});
});
