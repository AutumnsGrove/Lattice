/**
 * Taking back a session cookie (#1719).
 *
 * A browser treats a deletion with a different `domain` as a different cookie,
 * so getting this wrong is invisible in a unit test that only checks the name —
 * and leaves a forbidden user holding a session for every grove they visit.
 */

import { describe, it, expect, vi } from "vitest";
import {
	SESSION_COOKIE_NAMES,
	sessionCookieAttributes,
	clearSessionCookies,
} from "../session-cookies";

describe("sessionCookieAttributes", () => {
	it("matches Heartwood's cross-subdomain cookie in production", () => {
		// Heartwood: `crossSubDomainCookies: { domain: ".grove.place" }`.
		expect(sessionCookieAttributes("login.grove.place")).toEqual({
			path: "/",
			domain: ".grove.place",
		});
	});

	it("omits the domain in local dev, where Heartwood does too", () => {
		expect(sessionCookieAttributes("localhost")).toEqual({ path: "/" });
		expect(sessionCookieAttributes("127.0.0.1")).toEqual({ path: "/" });
	});
});

describe("clearSessionCookies", () => {
	it("deletes every session cookie with the attributes it was set with", () => {
		const cookies = { delete: vi.fn() };

		clearSessionCookies(cookies, "login.grove.place");

		expect(cookies.delete).toHaveBeenCalledTimes(SESSION_COOKIE_NAMES.length);
		for (const name of SESSION_COOKIE_NAMES) {
			expect(cookies.delete).toHaveBeenCalledWith(name, {
				path: "/",
				domain: ".grove.place",
			});
		}
	});
});
