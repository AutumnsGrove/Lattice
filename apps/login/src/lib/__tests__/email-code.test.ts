import { describe, it, expect } from "vitest";
import {
	EMAIL_CODE_MESSAGES,
	normalizeEmail,
	normalizeCode,
	messageForSendFailure,
	isRefusal,
	messageForVerifyFailure,
	statusForUpstreamFailure,
} from "../email-code";

describe("normalizeEmail", () => {
	it("trims and lowercases", () => {
		expect(normalizeEmail("  Friend@Example.COM ")).toBe("friend@example.com");
	});

	it("rejects missing, non-string, and malformed values", () => {
		expect(normalizeEmail(null)).toBeNull();
		expect(normalizeEmail(undefined)).toBeNull();
		expect(normalizeEmail(new File([""], "x"))).toBeNull();
		expect(normalizeEmail("")).toBeNull();
		expect(normalizeEmail("no-at-sign")).toBeNull();
		expect(normalizeEmail("a@b")).toBeNull();
		expect(normalizeEmail("two words@example.com")).toBeNull();
	});

	it("rejects absurdly long addresses", () => {
		expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
	});
});

describe("normalizeCode", () => {
	it("accepts six digits, ignoring pasted spaces and dashes", () => {
		expect(normalizeCode("123456")).toBe("123456");
		expect(normalizeCode(" 123 456 ")).toBe("123456");
		expect(normalizeCode("123-456")).toBe("123456");
	});

	it("keeps leading zeros", () => {
		expect(normalizeCode("004210")).toBe("004210");
	});

	it("rejects wrong length, letters, and non-strings", () => {
		expect(normalizeCode("12345")).toBeNull();
		expect(normalizeCode("1234567")).toBeNull();
		expect(normalizeCode("12345a")).toBeNull();
		expect(normalizeCode("")).toBeNull();
		expect(normalizeCode(null)).toBeNull();
	});
});

describe("messageForSendFailure", () => {
	it("maps rate limits, bad input, and everything else", () => {
		expect(messageForSendFailure(429)).toBe(EMAIL_CODE_MESSAGES.RATE_LIMITED);
		expect(messageForSendFailure(400)).toBe(EMAIL_CODE_MESSAGES.INVALID_EMAIL);
		expect(messageForSendFailure(500)).toBe(EMAIL_CODE_MESSAGES.SEND_FAILED);
	});
});

describe("messageForVerifyFailure", () => {
	it("maps Better Auth emailOTP error codes", () => {
		expect(messageForVerifyFailure(400, "INVALID_OTP")).toBe(EMAIL_CODE_MESSAGES.CODE_MISMATCH);
		expect(messageForVerifyFailure(400, "OTP_EXPIRED")).toBe(EMAIL_CODE_MESSAGES.CODE_EXPIRED);
		expect(messageForVerifyFailure(403, "TOO_MANY_ATTEMPTS")).toBe(
			EMAIL_CODE_MESSAGES.CODE_USED_UP,
		);
	});

	it("prefers the rate-limit message on 429 and falls back for unknown codes", () => {
		expect(messageForVerifyFailure(429, "INVALID_OTP")).toBe(EMAIL_CODE_MESSAGES.RATE_LIMITED);
		expect(messageForVerifyFailure(500)).toBe(EMAIL_CODE_MESSAGES.VERIFY_FAILED);
		expect(messageForVerifyFailure(400, "SOMETHING_NEW")).toBe(EMAIL_CODE_MESSAGES.VERIFY_FAILED);
	});
});

describe("statusForUpstreamFailure", () => {
	it("keeps rate limits, blames upstream outages on the gateway, and treats the rest as bad input", () => {
		expect(statusForUpstreamFailure(429)).toBe(429);
		expect(statusForUpstreamFailure(500)).toBe(502);
		expect(statusForUpstreamFailure(503)).toBe(502);
		expect(statusForUpstreamFailure(400)).toBe(400);
		expect(statusForUpstreamFailure(403)).toBe(400);
	});
});

describe("isRefusal", () => {
	it("treats a bare 403 as the hooks refusing the identity", () => {
		expect(isRefusal(403)).toBe(true);
	});

	it("leaves Better Auth's own 403s alone", () => {
		// A burned-out code is also a 403. It is not a refusal, and telling a
		// person their account is unavailable over an expired code would be a lie
		// with an appeal link attached (#1719).
		expect(isRefusal(403, "TOO_MANY_ATTEMPTS")).toBe(false);
		expect(isRefusal(403, "OTP_EXPIRED")).toBe(false);
		expect(isRefusal(403, "INVALID_OTP")).toBe(false);
	});

	it("is false for everything that is not a 403", () => {
		expect(isRefusal(429)).toBe(false);
		expect(isRefusal(500)).toBe(false);
		expect(isRefusal(400, "INVALID_OTP")).toBe(false);
	});

	it("maps a refusal to the unavailable copy, at both doors", () => {
		expect(messageForSendFailure(403)).toBe(EMAIL_CODE_MESSAGES.IDENTITY_UNAVAILABLE);
		expect(messageForVerifyFailure(403)).toBe(EMAIL_CODE_MESSAGES.IDENTITY_UNAVAILABLE);
	});
});
