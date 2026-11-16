import { describe, it, expect, vi, afterEach } from "vitest";
import { isLocalDevOrigin, isHumanVerified, safeReturnTo, turnstileEnv } from "./human-check";
import {
	TURNSTILE_COOKIE_NAME,
	createVerificationCookie,
} from "@autumnsgrove/lattice/server/services/turnstile";

const SECRET = "test-turnstile-secret";

function fakeCookies(value?: string) {
	return {
		get: (name: string) => (name === TURNSTILE_COOKIE_NAME ? value : undefined),
		set: vi.fn(),
	};
}

describe("isLocalDevOrigin", () => {
	it("recognises the dev stack", () => {
		for (const origin of ["http://localhost:5173", "http://127.0.0.1:8787", "http://[::1]:3000"]) {
			expect(isLocalDevOrigin(origin)).toBe(true);
		}
	});

	it("never bypasses on a real hostname", () => {
		for (const origin of [
			"https://plant.grove.place",
			"https://localhost.evil.com",
			"https://grove.place",
			undefined,
			"",
			"not a url",
		]) {
			expect(isLocalDevOrigin(origin)).toBe(false);
		}
	});
});

describe("isHumanVerified", () => {
	it("accepts a valid signed cookie", async () => {
		const value = await createVerificationCookie(SECRET);
		expect(
			await isHumanVerified(fakeCookies(value) as never, SECRET, "https://plant.grove.place"),
		).toBe(true);
	});

	it("rejects a missing or forged cookie", async () => {
		expect(
			await isHumanVerified(fakeCookies(undefined) as never, SECRET, "https://plant.grove.place"),
		).toBe(false);
		expect(
			await isHumanVerified(
				fakeCookies("1794783758000:deadbeef") as never,
				SECRET,
				"https://plant.grove.place",
			),
		).toBe(false);
	});

	it("rejects a cookie signed with a different key", async () => {
		const value = await createVerificationCookie("some-other-secret");
		expect(
			await isHumanVerified(fakeCookies(value) as never, SECRET, "https://plant.grove.place"),
		).toBe(false);
	});

	it("bypasses on the dev stack", async () => {
		expect(
			await isHumanVerified(fakeCookies(undefined) as never, SECRET, "http://localhost:5173"),
		).toBe(true);
	});

	it("fails closed when no signing key is configured outside dev", async () => {
		const value = await createVerificationCookie(SECRET);
		expect(
			await isHumanVerified(fakeCookies(value) as never, undefined, "https://plant.grove.place"),
		).toBe(false);
	});
});

describe("safeReturnTo", () => {
	it("allows relative paths", () => {
		expect(safeReturnTo("/profile")).toBe("/profile");
		expect(safeReturnTo("/plans?x=1")).toBe("/plans?x=1");
	});

	it("refuses absolute and protocol-relative targets", () => {
		for (const bad of [
			"https://evil.com",
			"//evil.com",
			"javascript:alert(1)",
			"",
			undefined,
			null,
		]) {
			expect(safeReturnTo(bad as string | null | undefined)).toBe("/profile");
		}
	});

	it("uses a caller-provided fallback", () => {
		expect(safeReturnTo(null, "/comped")).toBe("/comped");
	});
});

describe("turnstileEnv", () => {
	it("reads the keys off platform.env", () => {
		const env = turnstileEnv({
			env: { TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET_KEY: "secret" },
		});
		expect(env.TURNSTILE_SITE_KEY).toBe("site");
		expect(env.TURNSTILE_SECRET_KEY).toBe("secret");
	});

	it("tolerates a missing platform", () => {
		expect(turnstileEnv(undefined)).toEqual({});
		expect(turnstileEnv({})).toEqual({});
	});
});

describe("completeHumanCheck", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sets the shared cookie when Cloudflare says the token is good", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ success: true })),
		);
		const cookies = fakeCookies(undefined);
		const { completeHumanCheck } = await import("./human-check");

		const result = await completeHumanCheck(cookies as never, "a-token", SECRET);

		expect(result.ok).toBe(true);
		expect(cookies.set).toHaveBeenCalledTimes(1);
		const [name, , options] = cookies.set.mock.calls[0];
		expect(name).toBe(TURNSTILE_COOKIE_NAME);
		expect(options).toMatchObject({ domain: ".grove.place", httpOnly: true, path: "/" });
	});

	it("does not set a cookie when verification fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
			),
		);
		const cookies = fakeCookies(undefined);
		const { completeHumanCheck } = await import("./human-check");

		const result = await completeHumanCheck(cookies as never, "bad-token", SECRET);

		expect(result.ok).toBe(false);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it("fails closed when Cloudflare is unreachable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network");
			}),
		);
		const cookies = fakeCookies(undefined);
		const { completeHumanCheck } = await import("./human-check");

		const result = await completeHumanCheck(cookies as never, "a-token", SECRET);

		expect(result.ok).toBe(false);
		expect(cookies.set).not.toHaveBeenCalled();
	});
});
