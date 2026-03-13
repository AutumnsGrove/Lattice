/**
 * Webhook Route Tests
 *
 * Tests for POST /webhook endpoint that processes Stripe webhook events.
 * Covers signature verification (L-04 fix), rate limiting, idempotency,
 * payload sanitization, and event-specific handlers.
 *
 * Key fixes tested:
 *   - L-04: Rate limiting applied AFTER signature verification
 *   - I-01: Email addresses stripped from error messages before D1 storage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import webhook from "../../routes/webhook.js";
import {
	createMockEnv,
	createMockD1,
	createMockStripeInstance,
	createMockKV,
	TEST_ONBOARDING_ID,
} from "../helpers/mocks.js";
import type { StripeEvent } from "../../stripe/types.js";

// Hoist all mock variables so they're available when vi.mock() factories run
// (vi.mock is hoisted above const declarations — without vi.hoisted, variables
// would be in the temporal dead zone when the factory executes)
const {
	mockCreateTenant,
	mockGetTenantForOnboarding,
	mockSendPaymentReceivedEmail,
	mockSendPaymentFailedEmail,
	mockSanitizeStripeWebhookPayload,
	mockCalculateWebhookExpiry,
	mockCheckRateLimit,
} = vi.hoisted(() => ({
	mockCreateTenant: vi.fn(),
	mockGetTenantForOnboarding: vi.fn(),
	mockSendPaymentReceivedEmail: vi.fn(),
	mockSendPaymentFailedEmail: vi.fn(),
	mockSanitizeStripeWebhookPayload: vi.fn((event: any) => event),
	mockCalculateWebhookExpiry: vi.fn(() => Math.floor(Date.now() / 1000) + 86400 * 120),
	mockCheckRateLimit: vi.fn(),
}));

// Mock StripeClient
let mockStripe: ReturnType<typeof createMockStripeInstance>;
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

// Mock tenant service
vi.mock("../../services/tenant.js", () => ({
	createTenant: mockCreateTenant,
	getTenantForOnboarding: mockGetTenantForOnboarding,
}));

// Mock email service
vi.mock("../../services/email.js", () => ({
	sendPaymentReceivedEmail: mockSendPaymentReceivedEmail.mockResolvedValue(undefined),
	sendPaymentFailedEmail: mockSendPaymentFailedEmail.mockResolvedValue(undefined),
}));

// Mock sanitizer
vi.mock("../../utils/sanitizer.js", () => ({
	sanitizeStripeWebhookPayload: mockSanitizeStripeWebhookPayload,
	calculateWebhookExpiry: mockCalculateWebhookExpiry,
}));

// Mock rate limiter
vi.mock("../../middleware/rateLimit.js", () => ({
	checkRateLimit: mockCheckRateLimit,
	RATE_LIMITS: {
		webhook: {
			limit: 1000,
			windowSeconds: 3600,
			keyPrefix: "rl:webhook",
		},
	},
	extractClientIP: vi.fn(() => "1.2.3.4"),
}));

// Helper to create a basic webhook event
function createWebhookEvent(type: string, overrides: Partial<StripeEvent> = {}): StripeEvent {
	return {
		id: "evt_test_123",
		object: "event",
		type,
		created: Math.floor(Date.now() / 1000),
		livemode: false,
		data: {
			object: {},
		},
		...overrides,
	};
}

describe("POST /webhook", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		mockCreateTenant.mockClear();
		mockGetTenantForOnboarding.mockClear();
		mockSendPaymentReceivedEmail.mockClear();
		mockSendPaymentFailedEmail.mockClear();
		mockSanitizeStripeWebhookPayload.mockClear();
		mockCalculateWebhookExpiry.mockClear();
		mockCheckRateLimit.mockClear();
		vi.clearAllMocks();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// SIGNATURE VERIFICATION
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects missing stripe-signature header (400)", async () => {
		const env = createMockEnv();
		const payload = JSON.stringify(createWebhookEvent("test.event"));

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: { "Content-Type": "text/plain" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("Missing signature");
	});

	it("rejects invalid signature (401)", async () => {
		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: false,
			error: "Signature mismatch",
		});

		const env = createMockEnv();
		const payload = JSON.stringify(createWebhookEvent("test.event"));

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=invalid_signature",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(401);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("Signature mismatch");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// RATE LIMITING (L-04 FIX: AFTER signature verification)
	// ─────────────────────────────────────────────────────────────────────────

	it("applies rate limiting AFTER signature verification (L-04 fix)", async () => {
		const { db, mocks } = createMockD1();
		const mockKV = createMockKV();

		// Valid signature
		const event = createWebhookEvent("test.event");
		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Rate limit exceeded
		mockCheckRateLimit.mockResolvedValue({
			allowed: false,
			remaining: 0,
			resetAt: Math.floor(Date.now() / 1000) + 60,
		});

		const env = createMockEnv({ DB: db, CACHE_KV: mockKV });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		// Should reject with 429 (rate limited)
		expect(res.status).toBe(429);
		// Verify checkRateLimit was called AFTER verifyWebhookSignature
		expect(mockStripe.verifyWebhookSignature).toHaveBeenCalled();
		expect(mockCheckRateLimit).toHaveBeenCalled();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// IDEMPOTENCY
	// ─────────────────────────────────────────────────────────────────────────

	it("returns 200 for duplicate event (already processed)", async () => {
		const { db, mocks } = createMockD1();
		const event = createWebhookEvent("test.event");

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency check: event already exists with processed=1
		mocks.first.mockResolvedValueOnce({
			id: "webhook_evt_1",
			processed: 1,
		});

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.duplicate).toBe(true);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// EVENT HANDLERS
	// ─────────────────────────────────────────────────────────────────────────

	it("processes checkout.session.completed for new signup", async () => {
		const { db, mocks } = createMockD1();

		const event = createWebhookEvent("checkout.session.completed", {
			data: {
				object: {
					id: "cs_1",
					payment_status: "paid",
					customer: "cus_1",
					subscription: "sub_1",
					metadata: {
						onboarding_id: TEST_ONBOARDING_ID,
						plan: "seedling",
					},
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency: no existing event
		mocks.first
			.mockResolvedValueOnce(null) // idempotency check
			.mockResolvedValueOnce({
				// onboarding lookup
				id: TEST_ONBOARDING_ID,
				username: "testuser",
				display_name: "Test User",
				email: "test@test.com",
				plan_selected: "seedling",
				favorite_color: "#16a34a",
			});

		mockGetTenantForOnboarding.mockResolvedValue(null);
		mockCreateTenant.mockResolvedValue(undefined);

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(mockCreateTenant).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				onboardingId: TEST_ONBOARDING_ID,
				username: "testuser",
				email: "test@test.com",
				plan: "seedling",
				providerCustomerId: "cus_1",
				providerSubscriptionId: "sub_1",
			}),
		);
	});

	it("processes customer.subscription.updated", async () => {
		const { db, mocks } = createMockD1();

		const event = createWebhookEvent("customer.subscription.updated", {
			data: {
				object: {
					id: "sub_1",
					status: "active",
					customer: "cus_1",
					current_period_start: 1234567890,
					current_period_end: 1234567890 + 2592000,
					cancel_at_period_end: false,
					items: { data: [] },
					metadata: {},
					created: 1234567890,
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency: no existing event
		mocks.first.mockResolvedValueOnce(null);
		// run() for INSERT webhook_events
		// run() for UPDATE platform_billing
		mocks.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE platform_billing"));
	});

	it("processes customer.subscription.deleted (sets status to cancelled)", async () => {
		const { db, mocks } = createMockD1();

		const event = createWebhookEvent("customer.subscription.deleted", {
			data: {
				object: {
					id: "sub_1",
					status: "canceled",
					customer: "cus_1",
					current_period_start: 1234567890,
					current_period_end: 1234567890 + 2592000,
					cancel_at_period_end: true,
					items: { data: [] },
					metadata: {},
					created: 1234567890,
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		mocks.first.mockResolvedValueOnce(null);
		mocks.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE platform_billing"));
	});

	it("processes invoice.paid and sends receipt email", async () => {
		const { db, mocks } = createMockD1();
		const mockZephyr = {
			fetch: vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
		};

		const event = createWebhookEvent("invoice.paid", {
			data: {
				object: {
					id: "inv_1",
					customer: "cus_1",
					subscription: "sub_1",
					status: "paid",
					amount_paid: 9900, // $99.00
					currency: "usd",
					billing_reason: "subscription_create",
					lines: {
						data: [
							{
								id: "line_1",
								price: {
									id: "price_1",
									recurring: {
										interval: "month",
										interval_count: 1,
									},
								},
							},
						],
					},
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency check
		mocks.first
			.mockResolvedValueOnce(null) // idempotency check
			.mockResolvedValueOnce({
				// billing/tenant lookup for email
				id: "tenant_1",
				subdomain: "myblog",
				email: "user@example.com",
				display_name: "My Name",
				plan: "seedling",
				current_period_end: Math.floor(Date.now() / 1000) + 2592000,
			});

		mocks.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db, ZEPHYR: mockZephyr as unknown as Fetcher });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(mockSendPaymentReceivedEmail).toHaveBeenCalledWith(
			mockZephyr,
			expect.objectContaining({
				to: "user@example.com",
				name: "My Name",
				subdomain: "myblog",
				planName: "seedling",
				interval: "month",
			}),
		);
	});

	it("processes invoice.payment_failed and sends failure email", async () => {
		const { db, mocks } = createMockD1();
		const mockZephyr = {
			fetch: vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
		};

		const event = createWebhookEvent("invoice.payment_failed", {
			data: {
				object: {
					id: "inv_1",
					customer: "cus_1",
					subscription: "sub_1",
					status: "open",
					amount_paid: 0,
					amount_due: 9900,
					currency: "usd",
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency check
		mocks.first
			.mockResolvedValueOnce(null) // idempotency check
			.mockResolvedValueOnce({
				// billing/tenant lookup for email
				id: "tenant_1",
				subdomain: "myblog",
				email: "user@example.com",
				display_name: "My Name",
			});

		mocks.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db, ZEPHYR: mockZephyr as unknown as Fetcher });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(200);
		expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
			mockZephyr,
			expect.objectContaining({
				to: "user@example.com",
				name: "My Name",
				subdomain: "myblog",
			}),
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ERROR HANDLING
	// ─────────────────────────────────────────────────────────────────────────

	it("strips email from error messages before storage (I-01 fix)", async () => {
		const { db, mocks } = createMockD1();

		const event = createWebhookEvent("checkout.session.completed", {
			data: {
				object: {
					id: "cs_1",
					payment_status: "paid",
					customer: "cus_1",
					subscription: "sub_1",
					metadata: {
						onboarding_id: TEST_ONBOARDING_ID,
						plan: "seedling",
					},
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency: no existing event
		mocks.first.mockResolvedValueOnce(null);

		// getTenantForOnboarding throws with email in message
		mockGetTenantForOnboarding.mockRejectedValue(
			new Error("No such customer for email foo@bar.com"),
		);

		mocks.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(500);

		// Verify the error UPDATE was prepared
		const updateCall = mocks.prepare.mock.calls.find((call) =>
			call[0].includes("UPDATE webhook_events SET error"),
		);
		expect(updateCall).toBeDefined();

		// Check bind() was called with the sanitized error (email replaced with [email])
		const errorBindCall = mocks.bind.mock.calls.find((args) =>
			args.some((arg: unknown) => typeof arg === "string" && (arg as string).includes("[email]")),
		);
		expect(errorBindCall).toBeDefined();

		// Verify the raw email is NOT in any bind args
		const hasRawEmail = mocks.bind.mock.calls.some((args) =>
			args.some(
				(arg: unknown) => typeof arg === "string" && (arg as string).includes("foo@bar.com"),
			),
		);
		expect(hasRawEmail).toBe(false);
	});

	it("handles processing errors gracefully (500)", async () => {
		const { db, mocks } = createMockD1();

		// Use a real event type that triggers a handler which can throw
		const event = createWebhookEvent("checkout.session.completed", {
			data: {
				object: {
					id: "cs_fail",
					payment_status: "paid",
					customer: "cus_fail",
					subscription: "sub_fail",
					metadata: {
						onboarding_id: TEST_ONBOARDING_ID,
						plan: "seedling",
					},
				},
			},
		});

		mockStripe.verifyWebhookSignature.mockResolvedValue({
			valid: true,
			event,
		});

		// Idempotency check: no existing event
		mocks.first.mockResolvedValueOnce(null);

		// INSERT webhook_events succeeds (this is OUTSIDE try/catch)
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		// Handler throws — getTenantForOnboarding fails
		mockGetTenantForOnboarding.mockRejectedValue(new Error("Database connection lost"));

		// The catch block's UPDATE also succeeds
		mocks.run.mockResolvedValueOnce({ meta: { changes: 1 }, success: true });

		const env = createMockEnv({ DB: db });
		const payload = JSON.stringify(event);

		const res = await webhook.request(
			"/",
			{
				method: "POST",
				body: payload,
				headers: {
					"stripe-signature": "t=123,v1=valid",
					"Content-Type": "text/plain",
				},
			},
			env,
		);

		expect(res.status).toBe(500);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("Processing error");
	});
});
