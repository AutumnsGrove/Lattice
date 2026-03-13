/**
 * Portal Route Tests
 *
 * Tests for POST /portal endpoint that creates Stripe Billing Portal Sessions.
 * Tests validation (tenantId, returnUrl), database lookups, and customer checks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import portal from "../../routes/portal.js";
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

describe("POST /portal", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		vi.clearAllMocks();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// HAPPY PATH: Valid requests with proper responses
	// ─────────────────────────────────────────────────────────────────────────

	it("creates portal session for valid tenant with billing record", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
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

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.portalUrl).toBe("https://billing.stripe.com/p/session/mock_portal");
		expect(mockStripe.createBillingPortalSession).toHaveBeenCalledWith(
			"cus_test_123",
			"https://app.grove.place/settings/billing",
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// VALIDATION: Missing required fields
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects missing tenantId (BILLING-002)", async () => {
		const env = createMockEnv();

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					returnUrl: "https://app.grove.place/settings/billing",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-002");
	});

	it("rejects missing returnUrl (BILLING-002)", async () => {
		const env = createMockEnv();

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
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
	// VALIDATION: UUID format
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects invalid UUID format for tenantId", async () => {
		const env = createMockEnv();

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: "not-a-uuid",
					returnUrl: "https://app.grove.place/settings/billing",
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
	// VALIDATION: URL allowlist (grove.place)
	// ─────────────────────────────────────────────────────────────────────────

	it("rejects non-grove.place returnUrl", async () => {
		const env = createMockEnv();

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://evil.com/phishing",
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
	// DATABASE: Tenant lookup
	// ─────────────────────────────────────────────────────────────────────────

	it("returns BILLING-002 when tenant does not exist", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
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
	// DATABASE: Billing record lookup
	// ─────────────────────────────────────────────────────────────────────────

	it("returns BILLING-007 when no billing record exists", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
					})
					.mockResolvedValueOnce(null),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-007");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// BUSINESS LOGIC: Comped accounts
	// ─────────────────────────────────────────────────────────────────────────

	it("returns BILLING-004 for comped account (paid tier, no customer ID)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
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

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
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
	// BUSINESS LOGIC: Missing customer ID
	// ─────────────────────────────────────────────────────────────────────────

	it("returns BILLING-007 when free tier with no customer ID", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
					})
					.mockResolvedValueOnce({
						provider_customer_id: null,
						plan: "wanderer",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		const env = createMockEnv({ DB: db });

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("BILLING-007");
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ERROR HANDLING: Stripe errors
	// ─────────────────────────────────────────────────────────────────────────

	it("returns BILLING-005 when Stripe API fails", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
					})
					.mockResolvedValueOnce({
						provider_customer_id: "cus_test_123",
						plan: "seedling",
					}),
				run: vi.fn(),
				all: vi.fn(),
			}),
		});
		mockStripe.createBillingPortalSession.mockRejectedValue(new Error("Stripe API unavailable"));
		const env = createMockEnv({ DB: db });

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings/billing",
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
	// EDGE CASES: Multi-level subdomain URLs
	// ─────────────────────────────────────────────────────────────────────────

	it("accepts multi-level subdomain returnUrls (sub.sub.grove.place)", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
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

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://deep.subdomain.grove.place/billing/portal",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.portalUrl).toBeDefined();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// EDGE CASES: Return URL with query parameters
	// ─────────────────────────────────────────────────────────────────────────

	it("accepts returnUrl with query parameters", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi
					.fn()
					.mockResolvedValueOnce({
						id: TEST_TENANT_ID,
						plan: "wanderer",
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

		const res = await portal.request(
			"/",
			{
				method: "POST",
				body: JSON.stringify({
					tenantId: TEST_TENANT_ID,
					returnUrl: "https://app.grove.place/settings?tab=billing&view=invoices",
				}),
				headers: { "Content-Type": "application/json" },
			},
			env,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.portalUrl).toBeDefined();
		expect(mockStripe.createBillingPortalSession).toHaveBeenCalledWith(
			"cus_test_123",
			"https://app.grove.place/settings?tab=billing&view=invoices",
		);
	});
});
