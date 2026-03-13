/**
 * Subscription Resumption Route Tests
 *
 * Tests for POST /resume endpoint.
 * Verifies subscription resumption, validation of pending cancellation status,
 * audit logging, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import resume from "../../routes/resume.js";
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

let mockStripe: ReturnType<typeof createMockStripeInstance>;

describe("POST /resume", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		vi.clearAllMocks();
	});

	it("resumes subscription pending cancellation", async () => {
		const { db, mocks } = createMockD1();

		// D1 query returns billing with cancel_at_period_end = 1
		mocks.first.mockResolvedValueOnce({
			id: "billing-1",
			plan: "seedling",
			provider_subscription_id: "sub_test_123",
			cancel_at_period_end: 1,
			email: "test@example.com",
		});

		// UPDATE returns success
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const response = await resume.request(
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

		// Verify Stripe was called
		expect(mockStripe.resumeSubscription).toHaveBeenCalledWith("sub_test_123");

		// Verify DB UPDATE was called
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE platform_billing"));
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("cancel_at_period_end = 0"));
	});

	it("rejects if subscription is not pending cancellation (cancel_at_period_end = 0)", async () => {
		const { db, mocks } = createMockD1();

		// Billing record exists but cancel_at_period_end = 0
		mocks.first.mockResolvedValueOnce({
			id: "billing-2",
			plan: "seedling",
			provider_subscription_id: "sub_test_456",
			cancel_at_period_end: 0,
			email: "user@example.com",
		});

		const env = createMockEnv({ DB: db });
		const response = await resume.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(409);
		expect(body.error).toBe("BILLING-003");
		expect(body.detail).toMatch(/not pending cancellation/);

		// Stripe should not be called
		expect(mockStripe.resumeSubscription).not.toHaveBeenCalled();
	});

	it("returns BILLING-007 when no subscription found", async () => {
		const { db, mocks } = createMockD1();

		// Billing record exists but no provider_subscription_id
		mocks.first.mockResolvedValueOnce({
			id: "billing-3",
			plan: "seedling",
			provider_subscription_id: null,
			cancel_at_period_end: 0,
			email: "test@example.com",
		});

		const env = createMockEnv({ DB: db });
		const response = await resume.request(
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

		// No billing record
		mocks.first.mockResolvedValueOnce(null);

		const env = createMockEnv({ DB: db });
		const response = await resume.request(
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

	it("rejects invalid UUID format", async () => {
		const env = createMockEnv();
		const response = await resume.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: "invalid-uuid" }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(404);
		expect(body.error).toBe("BILLING-002");
		expect(body.detail).toMatch(/Invalid tenantId format/);
	});

	it("rejects when tenantId is missing", async () => {
		const env = createMockEnv();
		const response = await resume.request(
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

	it("calls logBillingAudit with subscription_resumed action", async () => {
		const { logBillingAudit } = await import("../../services/audit.js");
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce({
			id: "billing-4",
			plan: "sapling",
			provider_subscription_id: "sub_test_789",
			cancel_at_period_end: 1,
			email: "user@example.com",
		});

		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		await resume.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);

		expect(vi.mocked(logBillingAudit)).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				tenantId: TEST_TENANT_ID,
				action: "subscription_resumed",
				details: expect.objectContaining({
					plan: "sapling",
					subscriptionId: "sub_test_789",
				}),
			}),
		);
	});

	it("handles Stripe API errors gracefully", async () => {
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce({
			id: "billing-5",
			plan: "seedling",
			provider_subscription_id: "sub_test_error",
			cancel_at_period_end: 1,
			email: "test@example.com",
		});

		mockStripe.resumeSubscription.mockRejectedValueOnce(new Error("Stripe API timeout"));

		const env = createMockEnv({ DB: db });
		const response = await resume.request(
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

	it("handles missing email in audit log gracefully", async () => {
		const { logBillingAudit } = await import("../../services/audit.js");
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce({
			id: "billing-6",
			plan: "seedling",
			provider_subscription_id: "sub_test_noemail",
			cancel_at_period_end: 1,
			email: null,
		});

		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		await resume.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID }),
			},
			env,
		);

		expect(vi.mocked(logBillingAudit)).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				tenantId: TEST_TENANT_ID,
				action: "subscription_resumed",
				userEmail: undefined,
			}),
		);
	});
});
