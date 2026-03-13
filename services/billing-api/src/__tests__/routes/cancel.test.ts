/**
 * Subscription Cancellation Route Tests
 *
 * Tests for POST /cancel endpoint.
 * Verifies subscription cancellation (at period end or immediately),
 * audit logging, email sending, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import cancel from "../../routes/cancel.js";
import {
	createMockEnv,
	createMockD1,
	createMockStripeInstance,
	TEST_TENANT_ID,
} from "../helpers/mocks.js";

vi.mock("../../stripe/client.js", () => ({
	StripeClient: vi.fn(function () {
		return mockStripe;
	}),
	StripeAPIError: class extends Error {
		type: string;
		statusCode: number;

		constructor(e: any, s: number) {
			super(e.message);
			this.type = e.type;
			this.statusCode = s;
		}
	},
}));

vi.mock("../../services/audit.js", () => ({
	logBillingAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/email.js", () => ({
	sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}));

let mockStripe: ReturnType<typeof createMockStripeInstance>;

describe("POST /cancel", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		vi.clearAllMocks();
	});

	it("cancels subscription at period end (default)", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);
		const periodEnd = currentTime + 86400 * 30; // 30 days from now

		// D1 query returns billing + tenant + owner info
		mocks.first.mockResolvedValueOnce({
			id: "billing-1",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_123",
			current_period_end: periodEnd,
			subdomain: "testuser",
			email: "test@example.com",
			display_name: "Test User",
		});

		// Second call: UPDATE returns success
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.periodEnd).toBeDefined();
		expect(typeof body.periodEnd).toBe("string");

		// Verify Stripe was called with immediately=false
		expect(mockStripe.cancelSubscription).toHaveBeenCalledWith("sub_test_123", false);

		// Verify DB UPDATE was called
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE platform_billing"));
	});

	it("cancels immediately when immediately: true", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);
		const periodEnd = currentTime + 86400 * 30;

		// D1 query returns billing info
		mocks.first.mockResolvedValueOnce({
			id: "billing-2",
			plan: "sapling",
			status: "active",
			provider_subscription_id: "sub_test_456",
			current_period_end: periodEnd,
			subdomain: "user2",
			email: "user2@example.com",
			display_name: "User Two",
		});

		// UPDATE returns success
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					immediately: true,
				}),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);

		// Verify Stripe was called with immediately=true
		expect(mockStripe.cancelSubscription).toHaveBeenCalledWith("sub_test_456", true);

		// Verify UPDATE query includes status='cancelled'
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"));
	});

	it("rejects when tenantId is missing", async () => {
		const env = createMockEnv();
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({}),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-002");
		expect(body.message).toMatch(/Tenant not found/);
	});

	it("rejects invalid UUID format", async () => {
		const env = createMockEnv();
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: "not-a-uuid" }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-002");
		expect(body.detail).toMatch(/Invalid tenantId format/);
	});

	it("returns BILLING-007 when no subscription found", async () => {
		const { db, mocks } = createMockD1();

		// Billing query returns record without provider_subscription_id
		mocks.first.mockResolvedValueOnce({
			id: "billing-3",
			plan: "seedling",
			status: "active",
			provider_subscription_id: null,
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
			subdomain: "testuser",
			email: "test@example.com",
			display_name: "Test User",
		});

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-007");
		expect(body.message).toMatch(/No payment customer/);
	});

	it("returns BILLING-007 when billing record not found", async () => {
		const { db, mocks } = createMockD1();

		// No billing record found
		mocks.first.mockResolvedValueOnce(null);

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-007");
	});

	it("calls logBillingAudit with correct action", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);
		const periodEnd = currentTime + 86400 * 30;

		mocks.first.mockResolvedValueOnce({
			id: "billing-4",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_789",
			current_period_end: periodEnd,
			subdomain: "testuser",
			email: "test@example.com",
			display_name: "Test User",
		});

		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);

		const { logBillingAudit } = await import("../../services/audit.js");
		expect(vi.mocked(logBillingAudit)).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				tenantId: TEST_TENANT_ID,
				action: "subscription_cancelled",
				details: expect.objectContaining({
					plan: "seedling",
					immediate: false,
					subscriptionId: "sub_test_789",
				}),
			}),
		);
	});

	it("handles Stripe API errors gracefully", async () => {
		const { db, mocks } = createMockD1();
		const currentTime = Math.floor(Date.now() / 1000);

		mocks.first.mockResolvedValueOnce({
			id: "billing-5",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_error",
			current_period_end: currentTime + 86400 * 30,
			subdomain: "testuser",
			email: "test@example.com",
			display_name: "Test User",
		});

		mockStripe.cancelSubscription.mockRejectedValueOnce(new Error("Stripe API unavailable"));

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(500);
		expect(body.error).toBe("BILLING-005");
		expect(body.message).toMatch(/Payment provider error/);
	});
});
