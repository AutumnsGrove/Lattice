/**
 * DO Error System Tests
 *
 * Tests the error catalog structure and logDoError helper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DO_ERRORS, logDoError, type DoErrorKey } from "./errors";

describe("DO_ERRORS catalog", () => {
	it("should have unique error codes", () => {
		const codes = Object.values(DO_ERRORS).map((e) => e.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("should have DO- prefix on all codes", () => {
		for (const error of Object.values(DO_ERRORS)) {
			expect(error.code).toMatch(/^DO-\d{3}$/);
		}
	});

	it("should have valid categories", () => {
		for (const error of Object.values(DO_ERRORS)) {
			expect(["user", "bug"]).toContain(error.category);
		}
	});

	it("should have non-empty messages", () => {
		for (const error of Object.values(DO_ERRORS)) {
			expect(error.userMessage.length).toBeGreaterThan(0);
			expect(error.adminMessage.length).toBeGreaterThan(0);
		}
	});

	it("should have expected error keys", () => {
		const keys: DoErrorKey[] = [
			"CONTENT_NOT_FOUND",
			"INVALID_PAYLOAD",
			"INVALID_DIGEST_TIMES",
			"STORAGE_READ_FAILED",
			"EXPORT_PROCESSING_FAILED",
			"CLASSIFICATION_FAILED",
			"INTERNAL_ERROR",
		];
		for (const key of keys) {
			expect(DO_ERRORS[key]).toBeDefined();
		}
	});

	it("should separate user-facing errors (040-059) from internal (080-099)", () => {
		expect(DO_ERRORS.CONTENT_NOT_FOUND.category).toBe("user");
		expect(DO_ERRORS.INVALID_PAYLOAD.category).toBe("user");
		expect(DO_ERRORS.STORAGE_READ_FAILED.category).toBe("bug");
		expect(DO_ERRORS.INTERNAL_ERROR.category).toBe("bug");
	});
});

describe("logDoError", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("should log error with code and admin message", () => {
		logDoError(DO_ERRORS.INTERNAL_ERROR);

		expect(console.error).toHaveBeenCalledOnce();
		const logMsg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(logMsg).toContain("DO-099");
		expect(logMsg).toContain("Unhandled error in Durable Object");
	});

	it("should include context detail", () => {
		logDoError(DO_ERRORS.STORAGE_READ_FAILED, { detail: "R2 key missing" });

		const logJson = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
		const parsed = JSON.parse(logJson);
		expect(parsed.detail).toBe("R2 key missing");
		expect(parsed.code).toBe("DO-080");
	});

	it("should extract Error cause message", () => {
		logDoError(DO_ERRORS.EXPORT_PROCESSING_FAILED, {
			cause: new Error("Network timeout"),
		});

		const logJson = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
		const parsed = JSON.parse(logJson);
		expect(parsed.cause).toBe("Network timeout");
	});

	it("should stringify non-Error cause", () => {
		logDoError(DO_ERRORS.CLASSIFICATION_FAILED, { cause: "string error" });

		const logJson = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
		const parsed = JSON.parse(logJson);
		expect(parsed.cause).toBe("string error");
	});

	it("should handle missing context gracefully", () => {
		expect(() => logDoError(DO_ERRORS.INVALID_PAYLOAD)).not.toThrow();
	});
});
