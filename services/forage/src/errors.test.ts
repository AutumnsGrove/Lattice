/**
 * Forage Error System Tests
 *
 * Tests error catalog structure, logging helper, and response builder.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FORAGE_ERRORS, logForageError, buildForageErrorResponse } from "./errors";

describe("FORAGE_ERRORS catalog", () => {
	it("should have unique error codes", () => {
		const codes = Object.values(FORAGE_ERRORS).map((e) => e.code);
		const unique = new Set(codes);
		expect(unique.size).toBe(codes.length);
	});

	it("should follow FORAGE-NNN format", () => {
		for (const [key, error] of Object.entries(FORAGE_ERRORS)) {
			expect(error.code).toMatch(/^FORAGE-\d{3}$/);
		}
	});

	it("should have all required fields on every error", () => {
		for (const [key, error] of Object.entries(FORAGE_ERRORS)) {
			expect(error).toHaveProperty("code");
			expect(error).toHaveProperty("category");
			expect(error).toHaveProperty("userMessage");
			expect(error).toHaveProperty("adminMessage");
			expect(typeof error.userMessage).toBe("string");
			expect(typeof error.adminMessage).toBe("string");
		}
	});

	it("should use valid categories", () => {
		const validCategories = ["user", "admin", "bug"];
		for (const error of Object.values(FORAGE_ERRORS)) {
			expect(validCategories).toContain(error.category);
		}
	});

	it("should have infrastructure errors in 001-019 range", () => {
		const infraErrors = [
			FORAGE_ERRORS.API_KEY_NOT_CONFIGURED,
			FORAGE_ERRORS.PROVIDER_ERROR,
			FORAGE_ERRORS.PRICING_FETCH_FAILED,
		];
		for (const error of infraErrors) {
			const num = parseInt(error.code.split("-")[1]);
			expect(num).toBeGreaterThanOrEqual(1);
			expect(num).toBeLessThanOrEqual(19);
		}
	});

	it("should have validation errors in 040-059 range", () => {
		const validationErrors = [
			FORAGE_ERRORS.MISSING_REQUIRED_FIELDS,
			FORAGE_ERRORS.MISSING_JOB_ID,
			FORAGE_ERRORS.MISSING_VIBE_TEXT,
			FORAGE_ERRORS.VIBE_TEXT_TOO_SHORT,
		];
		for (const error of validationErrors) {
			const num = parseInt(error.code.split("-")[1]);
			expect(num).toBeGreaterThanOrEqual(40);
			expect(num).toBeLessThanOrEqual(59);
		}
	});

	it("should have internal errors in 080-099 range", () => {
		const internalErrors = [
			FORAGE_ERRORS.PARSE_FAILED,
			FORAGE_ERRORS.LIST_JOBS_FAILED,
			FORAGE_ERRORS.INTERNAL_ERROR,
		];
		for (const error of internalErrors) {
			const num = parseInt(error.code.split("-")[1]);
			expect(num).toBeGreaterThanOrEqual(80);
			expect(num).toBeLessThanOrEqual(99);
		}
	});
});

describe("logForageError", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("should log error code and admin message", () => {
		logForageError(FORAGE_ERRORS.INTERNAL_ERROR);

		expect(console.error).toHaveBeenCalledWith(
			"[Forage] FORAGE-099: Unhandled error in Forage service.",
			expect.any(String),
		);
	});

	it("should include context in log output", () => {
		logForageError(FORAGE_ERRORS.MISSING_JOB_ID, {
			path: "/api/status",
			detail: "no job_id param",
		});

		const logCall = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
		const contextJson = JSON.parse(logCall[1]);
		expect(contextJson.code).toBe("FORAGE-041");
		expect(contextJson.path).toBe("/api/status");
		expect(contextJson.detail).toBe("no job_id param");
	});

	it("should extract message from Error causes", () => {
		logForageError(FORAGE_ERRORS.PROVIDER_ERROR, {
			cause: new Error("connection refused"),
		});

		const logCall = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
		const contextJson = JSON.parse(logCall[1]);
		expect(contextJson.cause).toBe("connection refused");
	});

	it("should stringify non-Error causes", () => {
		logForageError(FORAGE_ERRORS.PROVIDER_ERROR, {
			cause: "raw string error",
		});

		const logCall = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
		const contextJson = JSON.parse(logCall[1]);
		expect(contextJson.cause).toBe("raw string error");
	});

	it("should omit cause when not provided", () => {
		logForageError(FORAGE_ERRORS.INTERNAL_ERROR, { path: "/test" });

		const logCall = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
		const contextJson = JSON.parse(logCall[1]);
		expect(contextJson).not.toHaveProperty("cause");
	});
});

describe("buildForageErrorResponse", () => {
	it("should return error code and user message", () => {
		const response = buildForageErrorResponse(FORAGE_ERRORS.JOB_NOT_FOUND);

		expect(response).toEqual({
			errorCode: "FORAGE-046",
			errorMessage: "Couldn't find that job.",
		});
	});

	it("should use userMessage (not adminMessage)", () => {
		const response = buildForageErrorResponse(FORAGE_ERRORS.INTERNAL_ERROR);

		expect(response.errorMessage).toBe("An unexpected error occurred.");
		expect(response.errorMessage).not.toBe("Unhandled error in Forage service.");
	});
});
