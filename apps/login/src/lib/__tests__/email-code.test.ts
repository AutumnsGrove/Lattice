import { describe, it, expect } from "vitest";
import {
	EMAIL_CODE_MESSAGES,
	normalizeEmail,
	normalizeCode,
	messageForSendFailure,
	messageForVerifyFailure,
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
