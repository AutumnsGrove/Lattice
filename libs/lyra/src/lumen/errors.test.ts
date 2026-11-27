import { describe, expect, it } from "vitest";
import { errorForResponse, readEnvelope, redact, stoppedError } from "./errors.js";

const NOW = 1_760_000_000_000;

describe("readEnvelope", () => {
	it("ERR01 reads Lumen's own envelope, and nothing else", () => {
		expect(
			readEnvelope('{"success":false,"error":{"code":"QUOTA_EXCEEDED","message":"no"}}'),
		).toEqual({ code: "QUOTA_EXCEEDED", message: "no" });
		expect(readEnvelope('{"error":"just a string"}')).toBeUndefined();
		expect(readEnvelope("not json")).toBeUndefined();
		expect(readEnvelope("")).toBeUndefined();
	});
});

describe("errorForResponse", () => {
	it("ERR02 maps each of Lumen's codes to a code and a retry decision", () => {
		const cases: Array<[string, string, boolean]> = [
			["AUTH_REQUIRED", "permission_denied", false],
			["INVALID_PARAMS", "bad_request", false],
			["QUOTA_EXCEEDED", "permission_denied", false],
			["SONGBIRD_REJECTED", "permission_denied", false],
			["RATE_LIMITED", "busy", true],
			["PROVIDER_ERROR", "provider_error", true],
			["ALL_PROVIDERS_FAILED", "provider_error", true],
			["INTERNAL_ERROR", "internal", true],
		];

		for (const [code, expectedCode, retryable] of cases) {
			const body = JSON.stringify({ success: false, error: { code, message: "asked" } });
			const error = errorForResponse(500, body, { now: NOW });
			expect(error.code, code).toBe(expectedCode);
			expect(error.retryable, code).toBe(retryable);
		}
	});

	it("ERR03 falls back to the HTTP rules when there is no envelope", () => {
		const busy = errorForResponse(429, "Too many", { now: NOW, retryAfter: "7" });
		expect(busy).toMatchObject({ code: "busy", retryable: true, retryAfterMs: 7_000 });

		const wrong = errorForResponse(400, "Bad body", { now: NOW });
		expect(wrong).toMatchObject({ code: "bad_request", retryable: false });
	});

	it("ERR04 never lets a key into a message", () => {
		const key = "sk-or-v1-0123456789abcdef";
		const error = errorForResponse(
			403,
			JSON.stringify({
				success: false,
				error: { code: "SONGBIRD_REJECTED", message: `refused a request carrying ${key}` },
			}),
			{ now: NOW, secret: key },
		);

		expect(error.message).not.toContain(key);
		expect(error.message).toContain("[redacted]");
	});

	it("ERR04b redacts a key echoed by a body that is not Lumen's envelope", () => {
		// A proxy 401 that repeats the credential it was given. This is the path that
		// reaches `errorForStatus`, which knows nothing about secrets.
		const key = "sk-or-v1-0123456789abcdef";
		const error = errorForResponse(401, `Unauthorized: bad key ${key}`, {
			now: NOW,
			secret: key,
		});

		expect(error.code).toBe("permission_denied");
		expect(error.retryable).toBe(false);
		expect(error.message).not.toContain(key);
		expect(error.message).toContain("[redacted]");
	});

	it("ERR05 truncates a long body", () => {
		const error = errorForResponse(502, "x".repeat(5_000), { now: NOW });
		expect(error.message.length).toBeLessThan(400);
	});
});

describe("redact and stoppedError", () => {
	it("ERR06 redacts every occurrence, and leaves text alone without a secret", () => {
		expect(redact("a sk-1 b sk-1", "sk-1")).toBe("a [redacted] b [redacted]");
		expect(redact("a sk-1 b", undefined)).toBe("a sk-1 b");
		expect(redact("a sk-1 b", "")).toBe("a sk-1 b");
	});

	it("ERR07 a stop is quiet and is not retried", () => {
		expect(stoppedError("sk-1")).toMatchObject({
			code: "timeout",
			message: "the model call was stopped",
			retryable: false,
		});
	});
});
