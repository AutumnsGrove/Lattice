import { describe, it, expect } from "vitest";
import { billingError, BILLING_ERRORS, type BillingErrorKey } from "../errors.js";

describe("BILLING_ERRORS catalog", () => {
	it("all error codes follow the BILLING-NNN format", () => {
		const codePattern = /^BILLING-\d{3}$/;
		for (const [key, def] of Object.entries(BILLING_ERRORS)) {
			expect(def.code, `${key} should have a BILLING-NNN code`).toMatch(codePattern);
		}
	});

	it("all entries have a message string", () => {
		for (const [key, def] of Object.entries(BILLING_ERRORS)) {
			expect(typeof def.message, `${key} should have a message`).toBe("string");
			expect(def.message.length, `${key} message should not be empty`).toBeGreaterThan(0);
		}
	});

	it("all entries have a valid HTTP status code", () => {
		const validStatuses = new Set([400, 401, 403, 404, 409, 422, 429, 500]);
		for (const [key, def] of Object.entries(BILLING_ERRORS)) {
			expect(validStatuses.has(def.status), `${key} has unrecognised status ${def.status}`).toBe(
				true,
			);
		}
	});

	it("INVALID_TIER has status 400", () => {
		expect(BILLING_ERRORS.INVALID_TIER.status).toBe(400);
		expect(BILLING_ERRORS.INVALID_TIER.code).toBe("BILLING-001");
	});

	it("TENANT_NOT_FOUND has status 404", () => {
		expect(BILLING_ERRORS.TENANT_NOT_FOUND.status).toBe(404);
		expect(BILLING_ERRORS.TENANT_NOT_FOUND.code).toBe("BILLING-002");
	});

	it("ALREADY_AT_TIER has status 409 (conflict)", () => {
		expect(BILLING_ERRORS.ALREADY_AT_TIER.status).toBe(409);
	});

	it("COMPED_ACCOUNT has status 409 (conflict)", () => {
		expect(BILLING_ERRORS.COMPED_ACCOUNT.status).toBe(409);
	});

	it("STRIPE_ERROR has status 500", () => {
		expect(BILLING_ERRORS.STRIPE_ERROR.status).toBe(500);
	});

	it("RATE_LIMITED has status 429", () => {
		expect(BILLING_ERRORS.RATE_LIMITED.status).toBe(429);
	});

	it("NO_CUSTOMER has status 404", () => {
		expect(BILLING_ERRORS.NO_CUSTOMER.status).toBe(404);
	});
});

describe("billingError()", () => {
	it("returns a Response object", () => {
		const response = billingError(BILLING_ERRORS.INVALID_TIER);
		expect(response).toBeInstanceOf(Response);
	});

	it("uses the correct HTTP status code from the error definition", () => {
		expect(billingError(BILLING_ERRORS.INVALID_TIER).status).toBe(400);
		expect(billingError(BILLING_ERRORS.TENANT_NOT_FOUND).status).toBe(404);
		expect(billingError(BILLING_ERRORS.STRIPE_ERROR).status).toBe(500);
		expect(billingError(BILLING_ERRORS.RATE_LIMITED).status).toBe(429);
	});

	it("sets Content-Type to application/json", () => {
		const response = billingError(BILLING_ERRORS.INVALID_TIER);
		expect(response.headers.get("Content-Type")).toBe("application/json");
	});

	it("response body contains error_code field (as 'error')", async () => {
		const response = billingError(BILLING_ERRORS.INVALID_TIER);
		const body = (await response.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	it("response body contains message field", async () => {
		const response = billingError(BILLING_ERRORS.INVALID_TIER);
		const body = (await response.json()) as Record<string, unknown>;
		expect(typeof body.message).toBe("string");
		expect((body.message as string).length).toBeGreaterThan(0);
	});

	it("includes detail when provided", async () => {
		const response = billingError(BILLING_ERRORS.STRIPE_ERROR, "Card declined");
		const body = (await response.json()) as Record<string, unknown>;
		expect(body.detail).toBe("Card declined");
	});

	it("omits detail field when not provided", async () => {
		const response = billingError(BILLING_ERRORS.INVALID_TIER);
		const body = (await response.json()) as Record<string, unknown>;
		expect(body).not.toHaveProperty("detail");
	});

	it("truncates detail to 200 characters", async () => {
		const longDetail = "x".repeat(300);
		const response = billingError(BILLING_ERRORS.STRIPE_ERROR, longDetail);
		const body = (await response.json()) as Record<string, unknown>;
		expect(typeof body.detail).toBe("string");
		expect((body.detail as string).length).toBe(200);
	});

	it("detail of exactly 200 chars is not truncated", async () => {
		const exact200 = "a".repeat(200);
		const response = billingError(BILLING_ERRORS.STRIPE_ERROR, exact200);
		const body = (await response.json()) as Record<string, unknown>;
		expect((body.detail as string).length).toBe(200);
	});

	it("works for all defined error codes", async () => {
		for (const [key, def] of Object.entries(BILLING_ERRORS)) {
			const response = billingError(def);
			expect(response.status, `${key} response status`).toBe(def.status);
			const body = (await response.json()) as Record<string, unknown>;
			expect(body.error, `${key} error code in body`).toBe(def.code);
		}
	});
});
