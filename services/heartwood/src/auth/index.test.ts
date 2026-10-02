/**
 * Tests for createAuth's directly-testable helpers.
 *
 * createAuth() itself builds a real Better Auth instance (D1, plugins,
 * OAuth config) — exercising it end-to-end belongs in integration tests
 * elsewhere. These cover the two pieces of logic pulled out specifically so
 * they're unit-testable: the pre-2FA-verification path gate (F2 in the
 * #1583 audit — bridging a session created before 2FA is checked would be a
 * 2FA bypass) and the rate-limit storage read/write (F3 — errors were
 * previously swallowed silently).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockEnv } from "../test-helpers.js";
import {
	EMAIL_OTP_SEND_LIMIT,
	EMAIL_OTP_SEND_LIMIT_LOCAL,
	EMAIL_OTP_SEND_WINDOW,
	EMAIL_OTP_VERIFY_LIMIT,
	EMAIL_OTP_VERIFY_WINDOW,
} from "../utils/constants.js";
import {
	createAuth,
	isPendingTwoFactorSignInPath,
	readBetterAuthRateLimitEntry,
	writeBetterAuthRateLimitEntry,
} from "./index.js";

describe("isPendingTwoFactorSignInPath", () => {
	it("matches the three sign-in paths Better Auth's twoFactor plugin gates", () => {
		expect(isPendingTwoFactorSignInPath("/api/auth/sign-in/email")).toBe(true);
		expect(isPendingTwoFactorSignInPath("/api/auth/sign-in/username")).toBe(true);
		expect(isPendingTwoFactorSignInPath("/api/auth/sign-in/phone-number")).toBe(true);
	});

	it("does not match OAuth sign-in or post-verification paths", () => {
		expect(isPendingTwoFactorSignInPath("/api/auth/sign-in/social")).toBe(false);
		expect(isPendingTwoFactorSignInPath("/api/auth/callback/google")).toBe(false);
		expect(isPendingTwoFactorSignInPath("/api/auth/two-factor/verify-totp")).toBe(false);
		expect(isPendingTwoFactorSignInPath("/api/auth/sign-out")).toBe(false);
		expect(isPendingTwoFactorSignInPath("/api/auth/session")).toBe(false);
	});
});

describe("readBetterAuthRateLimitEntry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no row exists", async () => {
		const env = createMockEnv({ DB: createMockDb({ first: null }) as unknown as D1Database });
		const result = await readBetterAuthRateLimitEntry(env, "ba:/sign-in/*:1.2.3.4");
		expect(result).toBeNull();
	});

	it("returns the parsed entry when a row exists", async () => {
		const windowStart = new Date("2026-08-29T00:00:00.000Z");
		const env = createMockEnv({
			DB: createMockDb({
				first: { count: 5, window_start: windowStart.toISOString() },
			}) as unknown as D1Database,
		});

		const result = await readBetterAuthRateLimitEntry(env, "ba:/sign-in/*:1.2.3.4");
		expect(result).toEqual({
			key: "ba:/sign-in/*:1.2.3.4",
			count: 5,
			lastRequest: windowStart.getTime(),
		});
	});

	it("fails open (returns null) and logs when the D1 read throws", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const throwingDb = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockRejectedValue(new Error("D1 unavailable")),
				}),
			}),
		};
		const env = createMockEnv({ DB: throwingDb as unknown as D1Database });

		const result = await readBetterAuthRateLimitEntry(env, "ba:/sign-in/*:1.2.3.4");

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Rate limit storage read failed"),
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});
});

describe("writeBetterAuthRateLimitEntry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("writes the entry via an upsert", async () => {
		const run = vi.fn().mockResolvedValue({ success: true });
		const bind = vi.fn().mockReturnValue({ run });
		const prepare = vi.fn().mockReturnValue({ bind });
		const env = createMockEnv({ DB: { prepare } as unknown as D1Database });

		await writeBetterAuthRateLimitEntry(env, "ba:/sign-in/*:1.2.3.4", {
			count: 3,
			lastRequest: 1735689600000,
		});

		expect(prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO rate_limits"));
		expect(bind).toHaveBeenCalledWith(
			"ba:/sign-in/*:1.2.3.4",
			3,
			new Date(1735689600000).toISOString(),
			3,
			new Date(1735689600000).toISOString(),
		);
		expect(run).toHaveBeenCalled();
	});

	it("does not throw and logs when the D1 write fails", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const throwingDb = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockRejectedValue(new Error("D1 unavailable")),
				}),
			}),
		};
		const env = createMockEnv({ DB: throwingDb as unknown as D1Database });

		await expect(
			writeBetterAuthRateLimitEntry(env, "ba:/sign-in/*:1.2.3.4", {
				count: 1,
				lastRequest: Date.now(),
			}),
		).resolves.toBeUndefined();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Rate limit storage write failed"),
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});
});

describe("email-code rate limit rules", () => {
	// Better Auth applies the FIRST customRules key that matches the path, in
	// insertion order, so the exact email-OTP rules must precede "/sign-in/*".
	// Resolve rules the same way Better Auth does, against the real config.
	function resolveRule(path: string, authBaseUrl: string) {
		const auth = createAuth(createMockEnv({ AUTH_BASE_URL: authBaseUrl }));
		const { customRules } = (
			auth.options as unknown as {
				rateLimit: { customRules: Record<string, { window: number; max: number }> };
			}
		).rateLimit;
		const key = Object.keys(customRules).find((pattern) =>
			pattern.endsWith("/*") ? path.startsWith(pattern.slice(0, -1)) : pattern === path,
		);
		return key ? customRules[key] : undefined;
	}

	it("limits sending codes by its own rule, not the /sign-in/* wildcard", () => {
		expect(resolveRule("/email-otp/send-verification-otp", "https://login.grove.place")).toEqual({
			window: EMAIL_OTP_SEND_WINDOW,
			max: EMAIL_OTP_SEND_LIMIT,
		});
	});

	it("relaxes the send limit only for a localhost AUTH_BASE_URL", () => {
		expect(resolveRule("/email-otp/send-verification-otp", "http://localhost:8787")).toEqual({
			window: EMAIL_OTP_SEND_WINDOW,
			max: EMAIL_OTP_SEND_LIMIT_LOCAL,
		});
	});

	it("limits verifying codes by its own rule, not the /sign-in/* wildcard", () => {
		expect(resolveRule("/sign-in/email-otp", "https://login.grove.place")).toEqual({
			window: EMAIL_OTP_VERIFY_WINDOW,
			max: EMAIL_OTP_VERIFY_LIMIT,
		});
	});
});
