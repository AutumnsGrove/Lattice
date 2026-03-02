/**
 * Error Catalog Tests
 *
 * Tests the Signpost error builder and error catalog structure.
 */

import { describe, it, expect } from "vitest";
import { REVERIE_ERRORS, buildReverieError } from "./errors";

describe("REVERIE_ERRORS", () => {
	it("should have unique error codes", () => {
		const codes = Object.values(REVERIE_ERRORS).map((e) => e.code);
		const unique = new Set(codes);
		expect(unique.size).toBe(codes.length);
	});

	it("should use REV- prefix on all codes", () => {
		for (const [key, def] of Object.entries(REVERIE_ERRORS)) {
			expect(def.code).toMatch(/^REV-\d{3}$/);
		}
	});

	it("should have valid HTTP status codes", () => {
		for (const def of Object.values(REVERIE_ERRORS)) {
			expect(def.status).toBeGreaterThanOrEqual(400);
			expect(def.status).toBeLessThanOrEqual(599);
		}
	});

	it("should have non-empty messages", () => {
		for (const def of Object.values(REVERIE_ERRORS)) {
			expect(def.message.length).toBeGreaterThan(0);
		}
	});
});

describe("buildReverieError", () => {
	it("should build error response without detail", () => {
		const result = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
		expect(result.body.success).toBe(false);
		expect(result.body.error.code).toBe("REV-001");
		expect(result.body.error.message).toBe("Authentication required");
		expect(result.status).toBe(401);
	});

	it("should append detail to message", () => {
		const result = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST, "missing 'input' field");
		expect(result.body.error.message).toBe("Invalid request body: missing 'input' field");
	});

	it("should preserve status code with detail", () => {
		const result = buildReverieError(REVERIE_ERRORS.TIER_FORBIDDEN, "upgrade to seedling");
		expect(result.status).toBe(403);
	});

	it("should handle each error type correctly", () => {
		// Spot-check a few important errors
		expect(buildReverieError(REVERIE_ERRORS.RATE_LIMITED).status).toBe(429);
		expect(buildReverieError(REVERIE_ERRORS.LUMEN_UNAVAILABLE).status).toBe(502);
		expect(buildReverieError(REVERIE_ERRORS.EXECUTION_FAILED).status).toBe(500);
		expect(buildReverieError(REVERIE_ERRORS.NO_DOMAINS_MATCHED).status).toBe(400);
		expect(buildReverieError(REVERIE_ERRORS.DOMAIN_READ_ONLY).status).toBe(403);
	});
});
