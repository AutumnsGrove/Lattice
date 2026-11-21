/**
 * Subscription Cancellation Route Tests
 *
 * Tests for POST /cancel endpoint.
 * Verifies subscription cancellation (at period end or immediately),
 * audit logging, email sending, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import cancel from "../../routes/cancel.js";
import { StripeAPIError } from "../../stripe/client.js";
import { sendCancellationEmail } from "../../services/email.js";
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

	// ───────────────────────────────────────────────────────────────────────
	// REMOVAL (#1745)
	// ───────────────────────────────────────────────────────────────────────

	it("stays quiet when the caller sends its own notice", async () => {
		// A removal cancels first and emails afterwards. Without this, the person gets
		// "your subscription is cancelled" and then "your account is gone" — two
		// systems disagreeing about what was decided.
		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-3",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_789",
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
			subdomain: "gone",
			email: "gone@example.com",
			display_name: "Gone",
		});
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID, immediately: true, notify: false }),
			},
			env,
		);

		expect(response.status).toBe(200);
		expect(sendCancellationEmail).not.toHaveBeenCalled();
	});

	it("still emails the account holder by default", async () => {
		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-4",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_999",
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
			subdomain: "stays",
			email: "stays@example.com",
			display_name: "Stays",
		});
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		await cancel.request(
			"/",
			{ method: "POST", body: JSON.stringify({ tenantId: TEST_TENANT_ID, immediately: true }) },
			env,
		);

		expect(sendCancellationEmail).toHaveBeenCalled();
	});

	it("counts the rate limit per tenant when there is no client IP", async () => {
		// A service binding carries no CF-Connecting-IP, so keying on it put every
		// internal caller in one "unknown" bucket: a cleanup of nine tenants would
		// stop at the sixth (#1745).
		const keys: string[] = [];
		const kv = {
			get: vi.fn(async (key: string) => {
				keys.push(key);
				return null;
			}),
			put: vi.fn(async () => undefined),
		};

		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-5",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_test_abc",
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
			subdomain: "internal",
			email: "internal@example.com",
			display_name: "Internal",
		});
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db, CACHE_KV: kv });
		await cancel.request(
			"/",
			{ method: "POST", body: JSON.stringify({ tenantId: TEST_TENANT_ID }) },
			env,
		);

		expect(keys[0]).toContain(`tenant:${TEST_TENANT_ID}`);
	});

	it("treats a subscription Stripe has already cancelled as success", async () => {
		// A removal cancels *before* it deletes and retries the whole operation, so a
		// cancel that can never succeed makes the tenant undeletable. A 404 here means
		// nothing is charging under that id, which is the outcome asked for.
		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-6",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_cancelled_by_hand",
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
			subdomain: "gone",
			email: "gone@example.com",
			display_name: "Gone",
		});
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		mockStripe.cancelSubscription.mockRejectedValueOnce(
			new StripeAPIError(
				{ message: "No such subscription: sub_cancelled_by_hand", type: "invalid_request_error" },
				404,
			),
		);

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({ tenantId: TEST_TENANT_ID, immediately: true, notify: false }),
			},
			env,
		);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.alreadyCancelled).toBe(true);
		// And the row is marked, so the next attempt skips the call entirely.
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"));
	});

	it("still reports a real Stripe failure", async () => {
		// The idempotent branch must not swallow the genuinely broken case.
		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-7",
			plan: "seedling",
			status: "active",
			provider_subscription_id: "sub_live",
			current_period_end: null,
			subdomain: "gone",
			email: null,
			display_name: null,
		});

		mockStripe.cancelSubscription.mockRejectedValueOnce(
			new StripeAPIError({ message: "Your card was declined", type: "card_error" }, 402),
		);

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{ method: "POST", body: JSON.stringify({ tenantId: TEST_TENANT_ID }) },
			env,
		);

		expect(response.status).toBe(500);
	});

	it("finds a subscription whose owner row is missing", async () => {
		// The owner details are only needed for the email. An INNER JOIN on
		// user_onboarding made a tenant with no onboarding row answer NO_CUSTOMER,
		// which a removal reads as "nothing to cancel" and deletes the rows that
		// could have cancelled a live subscription.
		const { db, mocks } = createMockD1();
		mocks.first.mockResolvedValueOnce({
			id: "billing-8",
			plan: "oak",
			status: "active",
			provider_subscription_id: "sub_orphan",
			current_period_end: null,
			subdomain: "orphan",
			email: null,
			display_name: null,
		});
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const response = await cancel.request(
			"/",
			{ method: "POST", body: JSON.stringify({ tenantId: TEST_TENANT_ID, immediately: true }) },
			env,
		);

		expect(response.status).toBe(200);
		expect(mocks.prepare).toHaveBeenCalledWith(
			expect.stringContaining("LEFT JOIN user_onboarding"),
		);
		expect(sendCancellationEmail).not.toHaveBeenCalled();
	});
});
