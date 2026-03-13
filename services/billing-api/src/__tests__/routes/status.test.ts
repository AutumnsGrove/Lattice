/**
 * Billing Status Route Tests
 *
 * Tests for GET /status/:tenantId endpoint.
 * Verifies tenant lookup, billing record retrieval, flourish state logic,
 * and error handling for invalid/missing tenants.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "../../routes/status.js";
import { createMockEnv, createMockD1, TEST_TENANT_ID } from "../helpers/mocks.js";
import type { BillingRecord } from "../../types.js";

describe("GET /status/:tenantId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns free tier for tenant with no billing record", async () => {
		const { db, mocks } = createMockD1();
		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "wanderer",
			active: 1,
		});
		// Second call: no billing record
		mocks.first.mockResolvedValueOnce(null);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.plan).toBe("wanderer");
		expect(body.status).toBe("active");
		expect(body.flourishState).toBe("free");
		expect(body.currentPeriodEnd).toBeNull();
		expect(body.cancelAtPeriodEnd).toBe(false);
		expect(body.isComped).toBe(false);
		expect(body.paymentMethod).toBeNull();
	});

	it("returns active billing status when subscription is active", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);
		const periodEnd = currentTime + 86400 * 30; // 30 days from now

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "seedling",
			active: 1,
		});
		// Second call: active billing record
		mocks.first.mockResolvedValueOnce({
			id: "billing_123",
			tenant_id: TEST_TENANT_ID,
			plan: "seedling",
			status: "active",
			provider_customer_id: "cus_test_123",
			provider_subscription_id: "sub_test_456",
			current_period_start: currentTime,
			current_period_end: periodEnd,
			cancel_at_period_end: 0,
			payment_method_last4: "4242",
			payment_method_brand: "visa",
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.plan).toBe("seedling");
		expect(body.status).toBe("active");
		expect(body.flourishState).toBe("active");
		expect(body.cancelAtPeriodEnd).toBe(false);
		expect(body.isComped).toBe(false);
		expect((body.paymentMethod as Record<string, unknown>).last4).toBe("4242");
		expect((body.paymentMethod as Record<string, unknown>).brand).toBe("visa");
	});

	it("returns comped flourish state when paid tier with no customer ID", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "sapling",
			active: 1,
		});
		// Second call: comped billing record (no provider_customer_id)
		mocks.first.mockResolvedValueOnce({
			id: "billing_456",
			tenant_id: TEST_TENANT_ID,
			plan: "sapling",
			status: "active",
			provider_customer_id: null,
			provider_subscription_id: null,
			current_period_start: currentTime,
			current_period_end: currentTime + 86400 * 365,
			cancel_at_period_end: 0,
			payment_method_last4: null,
			payment_method_brand: null,
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.flourishState).toBe("comped");
		expect(body.isComped).toBe(true);
		expect(body.paymentMethod).toBeNull();
	});

	it("returns cancelling flourish state when cancel_at_period_end is true", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "oak",
			active: 1,
		});
		// Second call: cancelling billing record
		mocks.first.mockResolvedValueOnce({
			id: "billing_789",
			tenant_id: TEST_TENANT_ID,
			plan: "oak",
			status: "active",
			provider_customer_id: "cus_test_999",
			provider_subscription_id: "sub_test_999",
			current_period_start: currentTime,
			current_period_end: currentTime + 86400 * 15,
			cancel_at_period_end: 1,
			payment_method_last4: "5555",
			payment_method_brand: "mastercard",
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.flourishState).toBe("cancelling");
		expect(body.cancelAtPeriodEnd).toBe(true);
	});

	it("returns past_due flourish state when status is past_due", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "seedling",
			active: 1,
		});
		// Second call: past_due billing record
		mocks.first.mockResolvedValueOnce({
			id: "billing_past_due",
			tenant_id: TEST_TENANT_ID,
			plan: "seedling",
			status: "past_due",
			provider_customer_id: "cus_test_pd",
			provider_subscription_id: "sub_test_pd",
			current_period_start: currentTime - 86400 * 30,
			current_period_end: currentTime - 86400,
			cancel_at_period_end: 0,
			payment_method_last4: "1234",
			payment_method_brand: "amex",
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.status).toBe("past_due");
		expect(body.flourishState).toBe("past_due");
	});

	it("returns 404 when tenantId is not a valid UUID", async () => {
		const env = createMockEnv();
		const response = await status.request("/not-a-uuid", {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-002");
		expect(body.message).toMatch(/Tenant not found/);
	});

	it("returns 404 when tenant does not exist in database", async () => {
		const { db, mocks } = createMockD1();
		// Tenant not found
		mocks.first.mockResolvedValueOnce(null);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-002");
		expect(body.message).toMatch(/Tenant not found/);
	});

	it("converts current_period_end timestamp to ISO string", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);
		const periodEnd = currentTime + 86400 * 30; // 30 days from now

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "seedling",
			active: 1,
		});
		// Second call: billing record with period end
		mocks.first.mockResolvedValueOnce({
			id: "billing_iso",
			tenant_id: TEST_TENANT_ID,
			plan: "seedling",
			status: "active",
			provider_customer_id: "cus_iso",
			provider_subscription_id: "sub_iso",
			current_period_start: currentTime,
			current_period_end: periodEnd,
			cancel_at_period_end: 0,
			payment_method_last4: "4242",
			payment_method_brand: "visa",
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		// currentPeriodEnd should be ISO string, not timestamp
		const isoString = new Date(periodEnd * 1000).toISOString();
		expect(body.currentPeriodEnd).toBe(isoString);
		expect(typeof body.currentPeriodEnd).toBe("string");
		expect((body.currentPeriodEnd as string).includes("T")).toBe(true);
	});

	it("includes payment method when available", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "sapling",
			active: 1,
		});
		// Second call: billing record with payment method
		mocks.first.mockResolvedValueOnce({
			id: "billing_payment",
			tenant_id: TEST_TENANT_ID,
			plan: "sapling",
			status: "active",
			provider_customer_id: "cus_payment",
			provider_subscription_id: "sub_payment",
			current_period_start: currentTime,
			current_period_end: currentTime + 86400 * 30,
			cancel_at_period_end: 0,
			payment_method_last4: "7890",
			payment_method_brand: "diners",
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.paymentMethod).toBeDefined();
		const paymentMethod = body.paymentMethod as Record<string, unknown>;
		expect(paymentMethod.last4).toBe("7890");
		expect(paymentMethod.brand).toBe("diners");
	});

	it("returns null paymentMethod when not available", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		// First call: tenant exists
		mocks.first.mockResolvedValueOnce({
			id: TEST_TENANT_ID,
			plan: "seedling",
			active: 1,
		});
		// Second call: billing record without payment method
		mocks.first.mockResolvedValueOnce({
			id: "billing_no_payment",
			tenant_id: TEST_TENANT_ID,
			plan: "seedling",
			status: "active",
			provider_customer_id: "cus_no_payment",
			provider_subscription_id: "sub_no_payment",
			current_period_start: currentTime,
			current_period_end: currentTime + 86400 * 30,
			cancel_at_period_end: 0,
			payment_method_last4: null,
			payment_method_brand: null,
			created_at: currentTime,
			updated_at: currentTime,
		} as BillingRecord);

		const env = createMockEnv({ DB: db });
		const response = await status.request(`/${TEST_TENANT_ID}`, {}, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.paymentMethod).toBeNull();
	});
});
