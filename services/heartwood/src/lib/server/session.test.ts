/**
 * A banned account has no valid session (#1722).
 *
 * This is the switch `gw account terminate` sets. It has been read by every
 * session path since #1681 and written by nothing until now, so the paths are
 * pinned here: a ban that is live means `validateSession` answers null, and a
 * ban that has run out means the session works again.
 *
 * The ban is checked on every fresh lookup. Heartwood caches session data in KV
 * for five minutes, so the cached copy carries the ban state it saw — which is
 * why the cache path is checked too rather than assumed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSession } from "./session";

const NOW = Math.floor(Date.now() / 1000);

/** A row shaped the way the real JOIN returns it. */
function sessionRow(overrides: Record<string, unknown> = {}) {
	return {
		session_id: "s-1",
		user_id: "u-1",
		token: "tok",
		expires_at: NOW + 3600,
		ip_address: null,
		user_agent: null,
		id: "u-1",
		email: "wanderer@example.com",
		name: "Wanderer",
		image: null,
		email_verified: 1,
		tenant_id: "t-1",
		is_admin: 0,
		login_count: 3,
		banned: 0,
		ban_reason: null,
		ban_expires: null,
		...overrides,
	};
}

function makeEnv(options: { row?: unknown; cached?: unknown } = {}) {
	const kv = {
		get: vi.fn(async () => options.cached ?? null),
		put: vi.fn(async () => undefined),
		delete: vi.fn(async () => undefined),
	};
	const db = {
		prepare: vi.fn(() => ({
			bind: vi.fn(() => ({
				first: vi.fn(async () => options.row ?? null),
			})),
		})),
	};
	return { SESSION_KV: kv, DB: db } as unknown as Parameters<typeof validateSession>[1];
}

function signedIn() {
	return new Request("https://grove.place/", {
		headers: { Cookie: "better-auth.session_token=tok.signature" },
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("validateSession", () => {
	it("returns the user for a healthy session", async () => {
		const user = await validateSession(signedIn(), makeEnv({ row: sessionRow() }));

		expect(user?.id).toBe("u-1");
		expect(user?.banned).toBe(false);
	});

	it("returns null for a banned account", async () => {
		const user = await validateSession(
			signedIn(),
			makeEnv({ row: sessionRow({ banned: 1, ban_reason: "link farm" }) }),
		);

		expect(user).toBeNull();
	});

	it("lets a ban that has run out expire with it", async () => {
		// A temporary ban that is over is a valid session again. Treating it as
		// still banned would lock someone out of an account we allowed back.
		const user = await validateSession(
			signedIn(),
			makeEnv({ row: sessionRow({ banned: 1, ban_expires: NOW - 60 }) }),
		);

		expect(user?.id).toBe("u-1");
	});

	it("honours a ban that has not expired yet", async () => {
		const user = await validateSession(
			signedIn(),
			makeEnv({ row: sessionRow({ banned: 1, ban_expires: NOW + 3600 }) }),
		);

		expect(user).toBeNull();
	});

	it("does not serve a banned user out of the KV cache", async () => {
		// The cached copy carries the ban state it saw when it was written, so a
		// ban applied inside the five-minute window is visible here without a
		// database read — and the cached *user* is what the branch returns.
		const cached = {
			session: {
				id: "s-1",
				userId: "u-1",
				token: "tok",
				expiresAt: new Date(Date.now() + 3600_000),
			},
			user: {
				id: "u-1",
				email: "wanderer@example.com",
				name: "Wanderer",
				image: null,
				emailVerified: true,
				tenantId: "t-1",
				isAdmin: false,
				loginCount: 1,
				banned: true,
				banReason: "link farm",
				banExpires: null,
			},
		};

		const user = await validateSession(signedIn(), makeEnv({ cached }));

		expect(user).toBeNull();
	});

	it("returns null with no session cookie at all", async () => {
		const request = new Request("https://grove.place/");
		expect(await validateSession(request, makeEnv({ row: sessionRow() }))).toBeNull();
	});
});
