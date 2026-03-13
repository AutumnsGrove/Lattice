/**
 * Checkout Route Tests
 *
 * Tests for POST /checkout endpoint that creates Stripe Checkout Sessions.
 * Tests validation (tier, billing cycle, email, URLs), database lookups,
 * and comped account logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import checkout from "../../routes/checkout.js";
import {
	createMockEnv,
	createMockD1,
	createMockStripeInstance,
	TEST_TENANT_ID,
	TEST_ONBOARDING_ID,
} from "../helpers/mocks.js";

vi.mock("../../stripe/client.js", () => ({
	StripeClient: vi.fn(function () {
		return mockStripe;
	}),
	StripeAPIError: class extends Error {
		type: string;
		stripeCode?: string;
		statusCode: number;

		constructor(e: any, s: number) {
			super(e.message);
			this.type = e.type;
			this.stripeCode = e.code;
			this.statusCode = s;
		}
	},
}));

let mockStripe: ReturnType<typeof createMockStripeInstance>;

describe("POST /checkout", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		vi.clearAllMocks();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// HAPPY PATH: Valid requests with proper responses
	// ─────────────────────────────────────────────────────────────────────────

	it("creates checkout session for existing tenant (tenantId provided)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce({
						provider_customer_id: "cus_test_123",
						plan: "wanderer",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_mock");
		expect(body.sessionId).toBe("cs_test_mock_session_123");
		expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
			expect.objectContaining({
				priceId: "price_1ShXzXRpJ6WVdxl3dwuzZX90",
				customerId: "cus_test_123",
				metadata: expect.objectContaining({
					tenant_id: TEST_TENANT_ID,
					plan: "seedling",
					billing_cycle: "monthly",
				}),
			}),
		);
	});

	it("creates checkout session for new onboarding (onboardingId provided)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					onboardingId: TEST_ONBOARDING_ID,
					tier: "seedling",
					billingCycle: "yearly",
					customerEmail: "user@example.com",
					successUrl: "https://app.grove.place/welcome",
					cancelUrl: "https://app.grove.place/signup",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.checkoutUrl).toBeDefined();
		expect(body.sessionId).toBeDefined();
		expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
			expect.objectContaining({
				priceId: "price_1ShXzXRpJ6WVdxl38ZgKg4Wk",
				customerId: undefined,
				customerEmail: "user@example.com",
				metadata: expect.objectContaining({
					onboarding_id: TEST_ONBOARDING_ID,
					plan: "seedling",
					billing_cycle: "yearly",
				}),
			}),
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// VALIDATION: Tier and Billing Cycle
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects invalid tier (returns BILLING-001)", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "invalid-tier",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	it("rejects invalid billing cycle (returns BILLING-001)", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "quarterly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// VALIDATION: IDs and UUIDs
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects missing both tenantId and onboardingId", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	it("rejects invalid UUID format for tenantId", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: "not-a-uuid",
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// VALIDATION: Email Format (L-05)
	// ─────────────────────────────────────────────────────────────────────────

	it("validates email format and rejects invalid email (L-05 fix)", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					onboardingId: TEST_ONBOARDING_ID,
					tier: "seedling",
					billingCycle: "monthly",
					customerEmail: "notanemail",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// VALIDATION: URLs (grove.place allowlist)
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects non-grove.place successUrl", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://evil.com/phishing",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	it("rejects non-grove.place cancelUrl", async () => {
		const env = createMockEnv();

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://bad-actor.net/steal-data",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-001");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// DATABASE: Tenant and Billing Records
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects when tenant does not exist (BILLING-002)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-002");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// BUSINESS LOGIC: Comped Accounts
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects comped accounts (paid tier, no customer ID — BILLING-004)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce({
						provider_customer_id: null,
						plan: "seedling",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "sapling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(409);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-004");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// BUSINESS LOGIC: Already at tier or above
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects already-at-tier (trying to checkout same or lower tier — BILLING-003)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce({
						provider_customer_id: "cus_test_123",
						plan: "seedling",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(409);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-003");
	});

	it("allows upgrading from lower tier to higher tier", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce({
						provider_customer_id: "cus_test_123",
						plan: "seedling",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "sapling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.checkoutUrl).toBeDefined();
		expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
			expect.objectContaining({
				customerId: "cus_test_123",
			}),
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ERROR HANDLING: Stripe errors
	// ─────────────────────────────────────────────────────────────────────────

	it("handles Stripe API errors (BILLING-005)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		mockStripe.createCheckoutSession.mockRejectedValue(new Error("Stripe API rate limit exceeded"));
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "monthly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(500);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-005");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// EDGE CASES: New tenant with no billing record
	// ─────────────────────────────────────────────────────────────────────────

	it("handles new tenant with no existing billing record", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
						active: 1,
					})
					.mockResolvedValueOnce(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await checkout.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					tier: "seedling",
					billingCycle: "yearly",
					successUrl: "https://billing.grove.place/success",
					cancelUrl: "https://billing.grove.place/cancel",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.checkoutUrl).toBeDefined();
		expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
			expect.objectContaining({
				customerId: undefined,
				priceId: "price_1ShXzXRpJ6WVdxl38ZgKg4Wk",
			}),
		);
	});
});
