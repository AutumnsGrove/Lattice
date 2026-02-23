/**
 * Tests for the SRV_ERRORS error catalog.
 *
 * Validates that all error definitions follow the Signpost standard
 * and have unique codes.
 */

import { describe, it, expect } from "vitest";
import { SRV_ERRORS } from "../src/errors.js";

describe("SRV_ERRORS", () => {
	const allErrors = Object.entries(SRV_ERRORS);

	it("should have at least 10 error definitions", () => {
		expect(allErrors.length).toBeGreaterThanOrEqual(10);
	});

	it("should have unique error codes", () => {
		const codes = allErrors.map(([, err]) => err.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("should use SRV prefix for all codes", () => {
		for (const [key, err] of allErrors) {
			expect(err.code).toMatch(/^SRV-\d{3}$/, `${key} has invalid code format: ${err.code}`);
		}
	});

	it("should have valid categories", () => {
		const validCategories = ["user", "admin", "bug"];
		for (const [key, err] of allErrors) {
			expect(validCategories).toContain(err.category);
			expect(err.category).toBeTruthy();
		}
	});

	it("should have non-empty userMessage for all errors", () => {
		for (const [key, err] of allErrors) {
			expect(err.userMessage.length).toBeGreaterThan(0);
		}
	});

	it("should have non-empty adminMessage for all errors", () => {
		for (const [key, err] of allErrors) {
			expect(err.adminMessage.length).toBeGreaterThan(0);
		}
	});

	it("should not expose internal details in userMessage", () => {
		const sensitiveTerms = ["D1", "R2", "KV", "Cloudflare", "binding", "adapter", "SQL", "env"];
		for (const [key, err] of allErrors) {
			for (const term of sensitiveTerms) {
				expect(err.userMessage.toLowerCase()).not.toContain(term.toLowerCase());
			}
		}
	});

	it("should have infrastructure errors in 001-019 range", () => {
		const infraErrors = [
			"DB_NOT_AVAILABLE",
			"STORAGE_NOT_AVAILABLE",
			"KV_NOT_AVAILABLE",
			"SERVICE_NOT_FOUND",
			"CONFIG_MISSING",
			"CONTEXT_INIT_FAILED",
		];
		for (const key of infraErrors) {
			const err = SRV_ERRORS[key as keyof typeof SRV_ERRORS];
			const num = parseInt(err.code.split("-")[1]!);
			expect(num).toBeGreaterThanOrEqual(1);
			expect(num).toBeLessThanOrEqual(19);
		}
	});

	it("should have business logic errors in 040-059 range", () => {
		const bizErrors = [
			"QUERY_FAILED",
			"STORAGE_UPLOAD_FAILED",
			"STORAGE_DOWNLOAD_FAILED",
			"KV_OPERATION_FAILED",
			"SERVICE_CALL_FAILED",
			"TRANSACTIONS_NOT_SUPPORTED",
			"PRESIGNED_URL_FAILED",
		];
		for (const key of bizErrors) {
			const err = SRV_ERRORS[key as keyof typeof SRV_ERRORS];
			const num = parseInt(err.code.split("-")[1]!);
			expect(num).toBeGreaterThanOrEqual(40);
			expect(num).toBeLessThanOrEqual(59);
		}
	});

	it("should have internal errors in 080-099 range", () => {
		const internalErrors = ["ADAPTER_ERROR", "SERIALIZATION_ERROR", "TIMEOUT"];
		for (const key of internalErrors) {
			const err = SRV_ERRORS[key as keyof typeof SRV_ERRORS];
			const num = parseInt(err.code.split("-")[1]!);
			expect(num).toBeGreaterThanOrEqual(80);
			expect(num).toBeLessThanOrEqual(99);
		}
	});
});
