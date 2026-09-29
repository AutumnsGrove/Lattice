/**
 * Integration tests for user profile routes (avatar, preferences)
 *
 * Covers the #1583 audit findings for this file:
 * - H-1: writes previously silently no-op'd for Better-Auth-only users
 *   (dual users/ba_user table split) — the regression tests below assert
 *   avatar writes actually land in the right table and that a 0-row write
 *   surfaces as 404, not a false 200.
 * - M-1: rate limiting was entirely absent
 * - M-2: avatarUrl had no length/shape bound beyond a prefix check
 * - M-3: no CSRF Origin/Referer validation
 * - M-4: PUT /preferences 500'd on a non-object JSON body
 * - L-2: the SessionDO auth branch had no ban check
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

vi.mock("../db/queries.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../db/queries.js")>();
	return {
		...actual,
		updateUserAvatar: vi.fn(),
		updateBetterAuthUserAvatar: vi.fn(),
		updateUserPreferences: vi.fn(),
		createAuditLog: vi.fn().mockResolvedValue(undefined),
	};
});

vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null), // not banned by default
			}),
		}),
	}),
}));

vi.mock("../lib/session.js", () => ({
	getSessionFromRequest: vi.fn(),
}));

vi.mock("../lib/server/session.js", () => ({
	validateSession: vi.fn(),
}));

vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../middleware/rateLimit.js")>();
	return {
		...actual,
		checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
	};
});

import userRoutes from "./user.js";
import {
	updateUserAvatar,
	updateBetterAuthUserAvatar,
	updateUserPreferences,
	createAuditLog,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { getSessionFromRequest } from "../lib/session.js";
import { validateSession as validateBetterAuthSession } from "../lib/server/session.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

const TRUSTED_ORIGIN = "https://auth.grove.place"; // matches mockEnv.AUTH_BASE_URL

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/user", userRoutes);
	return app;
}

function sessionDoSession(overrides: { valid?: boolean } = {}) {
	return {
		SESSIONS: {
			idFromName: vi.fn().mockReturnValue("do-id"),
			get: vi.fn().mockReturnValue({
				validateSession: vi.fn().mockResolvedValue({ valid: overrides.valid ?? true }),
			}),
		} as unknown as Env["SESSIONS"],
	};
}

function notBannedDb() {
	return {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null),
			}),
		}),
	};
}

function bannedDb() {
	return {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue({ banned: 1, ban_expires: null }),
			}),
		}),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getSessionFromRequest).mockResolvedValue(null);
	vi.mocked(validateBetterAuthSession).mockResolvedValue(null);
	vi.mocked(checkRouteRateLimit).mockResolvedValue({ allowed: true, remaining: 10 });
	vi.mocked(createDbSession).mockReturnValue(notBannedDb() as any);
});

// =============================================================================
// Identity resolution / authorization guard
// =============================================================================

describe("authorization guard (shared across all three routes)", () => {
	it("returns 401 when no session resolves", async () => {
		const app = createApp();
		const res = await app.request(
			"/user/avatar",
			{ method: "DELETE", headers: { Origin: TRUSTED_ORIGIN } },
			createMockEnv(),
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 for a banned user even with a valid SessionDO session", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(createDbSession).mockReturnValue(bannedDb() as any);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{ method: "DELETE", headers: { Origin: TRUSTED_ORIGIN } },
			env,
		);

		expect(res.status).toBe(401);
	});

	it("rejects a mismatched Origin (CSRF)", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{ method: "DELETE", headers: { Origin: "https://evil.com" } },
			env,
		);

		expect(res.status).toBe(403);
	});

	it("rejects a request with both Origin and Referer missing (fail closed)", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request("/user/avatar", { method: "DELETE" }, env);

		expect(res.status).toBe(403);
	});

	it("returns 429 when the per-user rate limit is exceeded", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(checkRouteRateLimit).mockResolvedValue({
			allowed: false,
			remaining: 0,
			retryAfter: 30,
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{ method: "DELETE", headers: { Origin: TRUSTED_ORIGIN } },
			env,
		);

		expect(res.status).toBe(429);
	});
});

// =============================================================================
// POST /user/avatar
// =============================================================================

describe("POST /user/avatar", () => {
	it("writes to the legacy users table for a SessionDO-resolved user", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(updateUserAvatar).mockResolvedValue(1);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ avatarUrl: "https://cdn.grove.place/avatars/user-1.png" }),
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(updateUserAvatar).toHaveBeenCalledWith(
			expect.anything(),
			"user-1",
			"https://cdn.grove.place/avatars/user-1.png",
		);
		expect(updateBetterAuthUserAvatar).not.toHaveBeenCalled();
		expect(createAuditLog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ event_type: "user_avatar_updated", user_id: "user-1" }),
		);
	});

	it("writes to ba_user.image for a Better-Auth-resolved user (H-1 regression)", async () => {
		vi.mocked(validateBetterAuthSession).mockResolvedValue({
			id: "ba-user-1",
			email: "robin@example.com",
			name: "Robin",
			image: null,
			isAdmin: false,
		} as any);
		vi.mocked(updateBetterAuthUserAvatar).mockResolvedValue(1);

		const app = createApp();
		const env = createMockEnv();
		const res = await app.request(
			"/user/avatar",
			{
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ avatarUrl: "https://cdn.grove.place/avatars/ba-user-1.png" }),
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(updateBetterAuthUserAvatar).toHaveBeenCalledWith(
			expect.anything(),
			"ba-user-1",
			"https://cdn.grove.place/avatars/ba-user-1.png",
		);
		expect(updateUserAvatar).not.toHaveBeenCalled();
	});

	it("returns 404 instead of a false success when the write affects 0 rows (H-1 regression)", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(updateUserAvatar).mockResolvedValue(0);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ avatarUrl: "https://cdn.grove.place/avatars/user-1.png" }),
			},
			env,
		);

		expect(res.status).toBe(404);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe("user_not_found");
	});

	it.each([
		["wrong origin", "https://cdn.grove.place.evil.com/avatars/x.png"],
		["query string appended", "https://cdn.grove.place/avatars/x.png?x=1"],
		["fragment appended", "https://cdn.grove.place/avatars/x.png#frag"],
		["invalid path characters", "https://cdn.grove.place/avatars/<script>.png"],
		["not a URL at all", "not-a-url"],
		["too long", `https://cdn.grove.place/${"a".repeat(600)}.png`],
	])("rejects an invalid avatarUrl: %s", async (_label, avatarUrl) => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{
				method: "POST",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ avatarUrl }),
			},
			env,
		);

		expect(res.status).toBe(400);
		expect(updateUserAvatar).not.toHaveBeenCalled();
	});
});

// =============================================================================
// DELETE /user/avatar
// =============================================================================

describe("DELETE /user/avatar", () => {
	it("clears the avatar and audit logs the removal", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(updateUserAvatar).mockResolvedValue(1);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/avatar",
			{ method: "DELETE", headers: { Origin: TRUSTED_ORIGIN } },
			env,
		);

		expect(res.status).toBe(200);
		expect(updateUserAvatar).toHaveBeenCalledWith(expect.anything(), "user-1", null);
		expect(createAuditLog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ event_type: "user_avatar_removed" }),
		);
	});
});

// =============================================================================
// PUT /user/preferences
// =============================================================================

describe("PUT /user/preferences", () => {
	it("updates valid preferences for a SessionDO-resolved user", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(updateUserPreferences).mockResolvedValue(1);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ theme: "dark", groveMode: true, season: "midnight" }),
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(updateUserPreferences).toHaveBeenCalledWith(expect.anything(), "user-1", {
			theme: "dark",
			grove_mode: true,
			season: "midnight",
		});
	});

	it("returns 501 (not a false success) for a Better-Auth-only user (H-1 regression)", async () => {
		vi.mocked(validateBetterAuthSession).mockResolvedValue({
			id: "ba-user-1",
			email: "robin@example.com",
			name: "Robin",
			image: null,
			isAdmin: false,
		} as any);

		const app = createApp();
		const env = createMockEnv();
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ theme: "dark" }),
			},
			env,
		);

		expect(res.status).toBe(501);
		expect(updateUserPreferences).not.toHaveBeenCalled();
	});

	it.each([
		["null", "null"],
		["a number", "42"],
		["a string", '"hello"'],
		["an array", "[1,2,3]"],
	])("returns 400, not a 500, for a non-object body (%s) — M-4 regression", async (_label, raw) => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: raw,
			},
			env,
		);

		expect(res.status).toBe(400);
	});

	it("rejects an invalid theme value", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ theme: "not-a-real-theme" }),
			},
			env,
		);

		expect(res.status).toBe(400);
		expect(updateUserPreferences).not.toHaveBeenCalled();
	});

	it("rejects an empty preferences payload", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({}),
			},
			env,
		);

		expect(res.status).toBe(400);
	});

	it("returns 404 instead of a false success when the write affects 0 rows", async () => {
		vi.mocked(getSessionFromRequest).mockResolvedValue({
			sessionId: "sess-1",
			userId: "user-1",
			signature: "sig",
		});
		vi.mocked(updateUserPreferences).mockResolvedValue(0);

		const app = createApp();
		const env = createMockEnv(sessionDoSession());
		const res = await app.request(
			"/user/preferences",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Origin: TRUSTED_ORIGIN },
				body: JSON.stringify({ theme: "dark" }),
			},
			env,
		);

		expect(res.status).toBe(404);
	});
});
