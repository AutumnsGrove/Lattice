/**
 * Error Handling Tests
 *
 * Tests safe error extraction from various shapes (Rootwork compliance)
 * and HTTP status code mapping.
 */

import { describe, it, expect } from "vitest";
import { extractError, buildErrorResponse } from "./errors";

describe("extractError", () => {
	it("should extract message from Error instances", () => {
		const result = extractError(new Error("Something broke"));
		expect(result.message).toBe("Something broke");
	});

	it("should extract message from plain strings", () => {
		const result = extractError("A string error");
		expect(result.message).toBe("A string error");
	});

	it("should extract message from objects with message property", () => {
		const result = extractError({ message: "Object error" });
		expect(result.message).toBe("Object error");
	});

	it("should use default message for unknown shapes", () => {
		const result = extractError(42);
		expect(result.message).toBe("An unexpected error occurred");
	});

	it("should use default message for null", () => {
		const result = extractError(null);
		expect(result.message).toBe("An unexpected error occurred");
	});

	it("should use default message for undefined", () => {
		const result = extractError(undefined);
		expect(result.message).toBe("An unexpected error occurred");
	});

	it("should map QUOTA_EXCEEDED code correctly", () => {
		const result = extractError({ code: "QUOTA_EXCEEDED", message: "Limit" });
		expect(result.code).toBe("QUOTA_EXCEEDED");
		expect(result.status).toBe(429);
	});

	it("should map RATE_LIMITED code correctly", () => {
		const result = extractError({ code: "RATE_LIMITED", message: "Too fast" });
		expect(result.code).toBe("RATE_LIMITED");
		expect(result.status).toBe(429);
	});

	it("should map UNAUTHORIZED to AUTH_REQUIRED", () => {
		const result = extractError({ code: "UNAUTHORIZED", message: "No auth" });
		expect(result.code).toBe("AUTH_REQUIRED");
		expect(result.status).toBe(401);
	});

	it("should map INVALID_TASK to INVALID_REQUEST", () => {
		const result = extractError({ code: "INVALID_TASK", message: "Bad task" });
		expect(result.code).toBe("INVALID_REQUEST");
		expect(result.status).toBe(400);
	});

	it("should map INVALID_INPUT to INVALID_PARAMS", () => {
		const result = extractError({ code: "INVALID_INPUT", message: "Bad input" });
		expect(result.code).toBe("INVALID_PARAMS");
		expect(result.status).toBe(400);
	});

	it("should map PROVIDER_TIMEOUT to PROVIDER_ERROR", () => {
		const result = extractError({ code: "PROVIDER_TIMEOUT", message: "Timeout" });
		expect(result.code).toBe("PROVIDER_ERROR");
		expect(result.status).toBe(500);
	});

	it("should map SONGBIRD_REJECTED correctly", () => {
		const result = extractError({ code: "SONGBIRD_REJECTED", message: "Content blocked" });
		expect(result.code).toBe("SONGBIRD_REJECTED");
		expect(result.status).toBe(500);
	});

	it("should map ALL_PROVIDERS_FAILED correctly", () => {
		const result = extractError({ code: "ALL_PROVIDERS_FAILED", message: "No providers" });
		expect(result.code).toBe("ALL_PROVIDERS_FAILED");
		expect(result.status).toBe(500);
	});

	it("should default unmapped codes to INTERNAL_ERROR", () => {
		const result = extractError({ code: "TOTALLY_UNKNOWN", message: "?" });
		expect(result.code).toBe("INTERNAL_ERROR");
		expect(result.status).toBe(500);
	});

	it("should default to INTERNAL_ERROR when no code present", () => {
		const result = extractError(new Error("No code"));
		expect(result.code).toBe("INTERNAL_ERROR");
		expect(result.status).toBe(500);
	});

	it("should ignore non-string code values", () => {
		const result = extractError({ code: 123, message: "Numeric code" });
		expect(result.code).toBe("INTERNAL_ERROR");
	});
});

describe("buildErrorResponse", () => {
	it("should build standard error response envelope", () => {
		const startTime = Date.now() - 50;
		const { body, status } = buildErrorResponse(
			{ code: "QUOTA_EXCEEDED", message: "Limit reached" },
			"generation",
			startTime,
		);

		expect(body.success).toBe(false);
		expect(body.error?.code).toBe("QUOTA_EXCEEDED");
		expect(body.error?.message).toBe("Limit reached");
		expect(body.meta?.task).toBe("generation");
		expect(body.meta?.model).toBe("");
		expect(body.meta?.provider).toBe("");
		expect(body.meta?.latencyMs).toBeGreaterThanOrEqual(0);
		expect(status).toBe(429);
	});

	it("should compute latency from startTime", () => {
		const startTime = Date.now() - 100;
		const { body } = buildErrorResponse(new Error("fail"), "embedding", startTime);

		expect(body.meta?.latencyMs).toBeGreaterThanOrEqual(90);
		expect(body.meta?.latencyMs).toBeLessThan(500);
	});
});
