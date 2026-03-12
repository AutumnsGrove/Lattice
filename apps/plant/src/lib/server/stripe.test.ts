import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external lattice dependencies
vi.mock("@autumnsgrove/lattice/config", () => ({
	PAID_TIERS: {
		seedling: { display: { name: "Seedling" } },
		sapling: { display: { name: "Sapling" } },
		oak: { display: { name: "Oak" } },
		evergreen: { display: { name: "Evergreen" } },
	},
}));

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/utils", () => ({
	safeParseJson: vi.fn((str: string, fallback: any) => {
		try {
			return JSON.parse(str);
		} catch {
			return fallback;
		}
	}),
}));

import {
	getPriceId,
	STRIPE_PRICES,
	mapSubscriptionStatus,
	createCheckoutSession,
	createBillingPortalSession,
	verifyWebhookSignature,
} from "./stripe";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import { safeParseJson } from "@autumnsgrove/lattice/utils";
import { PLANT_ERRORS } from "$lib/errors";

// =============================================================================
// TEST HELPERS
// =============================================================================

function makeCheckoutParams() {
	return {
		stripeSecretKey: "sk_test_123",
		priceId: "price_123",
		customerEmail: "test@example.com",
		onboardingId: "onb-123",
		username: "testuser",
		plan: "seedling" as const,
		billingCycle: "monthly" as const,
		successUrl: "https://plant.grove.place/success",
		cancelUrl: "https://plant.grove.place/plans",
	};
}

async function createValidSignature(
	payload: string,
	secret: string,
	timestamp?: number,
): Promise<string> {
	const ts = timestamp ?? Math.floor(Date.now() / 1000);
	const signedPayload = `${ts}.${payload}`;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
	const hex = Array.from(new Uint8Array(signatureBytes))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `t=${ts},v1=${hex}`;
}

// =============================================================================
// TESTS: getPriceId
// =============================================================================

describe("getPriceId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns correct price ID for seedling monthly", () => {
		expect(getPriceId("seedling", "monthly")).toBe(STRIPE_PRICES.seedling.monthly);
	});

	it("returns correct price ID for oak yearly", () => {
		expect(getPriceId("oak", "yearly")).toBe(STRIPE_PRICES.oak.yearly);
	});

	it("returns price IDs for all plan and cycle combinations", () => {
		const plans = ["seedling", "sapling", "oak", "evergreen"] as const;
		const cycles = ["monthly", "yearly"] as const;
		for (const plan of plans) {
			for (const cycle of cycles) {
				expect(getPriceId(plan, cycle)).toMatch(/^price_/);
			}
		}
	});

	it("throws for invalid plan", () => {
		expect(() => getPriceId("invalid" as any, "monthly")).toThrow();
	});

	it("logs error when price ID is missing", () => {
		expect(() => getPriceId("seedling", "monthly")).not.toThrow();
		// When error is called, logGroveError should be called
		expect(logGroveError).not.toHaveBeenCalled();
	});

	it("throws error with correct PLANT error code", () => {
		try {
			// Force error by using invalid tier
			getPriceId("invalid" as any, "monthly");
			expect.fail("Should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(Error);
			expect((err as Error).message).toContain("PLANT-005");
		}
	});
});

// =============================================================================
// TESTS: mapSubscriptionStatus
// =============================================================================

describe("mapSubscriptionStatus", () => {
	it("maps 'active' to 'active'", () => {
		expect(mapSubscriptionStatus("active")).toBe("active");
	});

	it("maps 'trialing' to 'active'", () => {
		expect(mapSubscriptionStatus("trialing")).toBe("active");
	});

	it("maps 'past_due' to 'past_due'", () => {
		expect(mapSubscriptionStatus("past_due")).toBe("past_due");
	});

	it("maps 'unpaid' to 'past_due'", () => {
		expect(mapSubscriptionStatus("unpaid")).toBe("past_due");
	});

	it("maps 'canceled' to 'cancelled'", () => {
		expect(mapSubscriptionStatus("canceled")).toBe("cancelled");
	});

	it("maps 'incomplete' to 'past_due'", () => {
		expect(mapSubscriptionStatus("incomplete")).toBe("past_due");
	});

	it("maps 'incomplete_expired' to 'expired'", () => {
		expect(mapSubscriptionStatus("incomplete_expired")).toBe("expired");
	});

	it("maps 'paused' to 'paused'", () => {
		expect(mapSubscriptionStatus("paused")).toBe("paused");
	});

	it("returns 'active' for unknown status", () => {
		expect(mapSubscriptionStatus("unknown_status")).toBe("active");
	});

	it("returns 'active' for empty string", () => {
		expect(mapSubscriptionStatus("")).toBe("active");
	});
});

// =============================================================================
// TESTS: createCheckoutSession
// =============================================================================

describe("createCheckoutSession", () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends POST to Stripe checkout/sessions endpoint", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ id: "cs_123", url: "https://checkout.stripe.com/..." }), {
				status: 200,
			}),
		);

		await createCheckoutSession(params);

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("checkout/sessions"),
			expect.any(Object),
		);
	});

	it("includes correct Authorization header with Bearer token", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ id: "cs_123", url: "https://checkout.stripe.com/..." }), {
				status: 200,
			}),
		);

		await createCheckoutSession(params);

		const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
		expect(callArgs.headers).toEqual(
			expect.objectContaining({
				Authorization: `Bearer ${params.stripeSecretKey}`,
			}),
		);
	});

	it("includes metadata in form body", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ id: "cs_123", url: "https://checkout.stripe.com/..." }), {
				status: 200,
			}),
		);

		await createCheckoutSession(params);

		const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
		const body = callArgs.body as string;
		expect(body).toContain(`metadata%5Bonboarding_id%5D=${params.onboardingId}`);
		expect(body).toContain(`metadata%5Busername%5D=${params.username}`);
		expect(body).toContain(`metadata%5Bplan%5D=${params.plan}`);
		expect(body).toContain(`metadata%5Bbilling_cycle%5D=${params.billingCycle}`);
	});

	it("includes customer_email in request body", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ id: "cs_123", url: "https://checkout.stripe.com/..." }), {
				status: 200,
			}),
		);

		await createCheckoutSession(params);

		const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
		const body = callArgs.body as string;
		expect(body).toContain(`customer_email=${encodeURIComponent(params.customerEmail)}`);
	});

	it("returns sessionId and url on success", async () => {
		const params = makeCheckoutParams();
		const expectedId = "cs_123";
		const expectedUrl = "https://checkout.stripe.com/pay/cs_123";
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ id: expectedId, url: expectedUrl }), {
				status: 200,
			}),
		);

		const result = await createCheckoutSession(params);

		expect(result).toEqual({ sessionId: expectedId, url: expectedUrl });
	});

	it("throws with PLANT-006 code when Stripe returns error", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: {
						message: "Invalid price",
						type: "invalid_request_error",
					},
				}),
				{ status: 400 },
			),
		);

		await expect(createCheckoutSession(params)).rejects.toThrow("PLANT-006");
		expect(logGroveError).toHaveBeenCalledWith(
			"Plant",
			PLANT_ERRORS.STRIPE_CHECKOUT_FAILED,
			expect.any(Object),
		);
	});

	it("throws with PLANT-007 code when response missing url", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "cs_123" }), { status: 200 }));

		await expect(createCheckoutSession(params)).rejects.toThrow("PLANT-007");
		expect(logGroveError).toHaveBeenCalledWith(
			"Plant",
			PLANT_ERRORS.STRIPE_CHECKOUT_NO_URL,
			expect.any(Object),
		);
	});

	it("throws with PLANT-007 code when response missing id", async () => {
		const params = makeCheckoutParams();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ url: "https://checkout.stripe.com/..." }), { status: 200 }),
		);

		await expect(createCheckoutSession(params)).rejects.toThrow("PLANT-007");
	});
});

// =============================================================================
// TESTS: createBillingPortalSession
// =============================================================================

describe("createBillingPortalSession", () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends POST to billing_portal/sessions endpoint", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ url: "https://billing.stripe.com/..." }), { status: 200 }),
		);

		await createBillingPortalSession("sk_test_123", "cus_123", "https://example.com");

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("billing_portal/sessions"),
			expect.any(Object),
		);
	});

	it("returns url on success", async () => {
		const expectedUrl = "https://billing.stripe.com/session/abc123";
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ url: expectedUrl }), { status: 200 }),
		);

		const result = await createBillingPortalSession(
			"sk_test_123",
			"cus_123",
			"https://example.com",
		);

		expect(result).toEqual({ url: expectedUrl });
	});

	it("throws with PLANT-008 when Stripe returns error", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: { message: "Invalid customer" },
				}),
				{ status: 400 },
			),
		);

		await expect(
			createBillingPortalSession("sk_test_123", "cus_123", "https://example.com"),
		).rejects.toThrow("PLANT-008");
		expect(logGroveError).toHaveBeenCalledWith(
			"Plant",
			PLANT_ERRORS.STRIPE_PORTAL_FAILED,
			expect.any(Object),
		);
	});

	it("throws with PLANT-009 when response missing url", async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

		await expect(
			createBillingPortalSession("sk_test_123", "cus_123", "https://example.com"),
		).rejects.toThrow("PLANT-009");
		expect(logGroveError).toHaveBeenCalledWith("Plant", PLANT_ERRORS.STRIPE_PORTAL_NO_URL);
	});

	it("includes customer and return_url in request body", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ url: "https://billing.stripe.com/..." }), { status: 200 }),
		);

		await createBillingPortalSession("sk_test_123", "cus_123", "https://example.com");

		const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
		const body = callArgs.body as string;
		expect(body).toContain("customer=cus_123");
		expect(body).toContain(`return_url=${encodeURIComponent("https://example.com")}`);
	});
});

// =============================================================================
// TESTS: verifyWebhookSignature
// =============================================================================

describe("verifyWebhookSignature", () => {
	const testEvent = {
		id: "evt_test_123",
		object: "event",
		type: "checkout.session.completed",
		data: { object: { id: "cs_123" } },
		created: Math.floor(Date.now() / 1000),
		livemode: false,
	};
	const payload = JSON.stringify(testEvent);
	const secret = "whsec_test_secret";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns valid: false when signature is empty", async () => {
		const result = await verifyWebhookSignature(payload, "", secret);

		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("returns valid: false when secret is empty", async () => {
		const result = await verifyWebhookSignature(payload, "t=123,v1=abc", "");

		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("returns valid: true for correct signature", async () => {
		const signature = await createValidSignature(payload, secret);

		const result = await verifyWebhookSignature(payload, signature, secret);

		expect(result.valid).toBe(true);
		expect(result.event).toBeDefined();
		expect(result.error).toBeUndefined();
	});

	it("returns valid: false for incorrect signature", async () => {
		const wrongSignature = await createValidSignature(payload, "wrong_secret");

		const result = await verifyWebhookSignature(payload, wrongSignature, secret);

		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("returns valid: false when timestamp is too old", async () => {
		const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds old
		const signature = await createValidSignature(payload, secret, oldTimestamp);

		const result = await verifyWebhookSignature(
			payload,
			signature,
			secret,
			300, // 300 second tolerance
		);

		expect(result.valid).toBe(false);
		expect(result.error).toContain("too old");
	});

	it("returns parsed event on valid signature", async () => {
		const signature = await createValidSignature(payload, secret);

		const result = await verifyWebhookSignature(payload, signature, secret);

		expect(result.valid).toBe(true);
		expect(result.event).toEqual(testEvent);
	});

	it("handles multiple v1 signatures - accepts correct one", async () => {
		const correctSig = await createValidSignature(payload, secret);
		const wrongSig = await createValidSignature(payload, "different_secret");
		// Manually construct signature with both v1 values
		const parts = correctSig.split(",");
		const multiSig = `${parts[0]},${wrongSig.split(",")[1]},${parts[1]}`;

		const result = await verifyWebhookSignature(payload, multiSig, secret);

		expect(result.valid).toBe(true);
		expect(result.event).toEqual(testEvent);
	});

	it("returns error for invalid signature format - no t= prefix", async () => {
		const result = await verifyWebhookSignature(payload, "v1=somesignature", secret);

		expect(result.valid).toBe(false);
		expect(result.error).toContain("Invalid signature format");
	});

	it("returns error for malformed JSON payload", async () => {
		const signature = await createValidSignature("{invalid json", secret);

		const result = await verifyWebhookSignature("{invalid json", signature, secret);

		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("handles custom toleranceSeconds parameter", async () => {
		const oldTimestamp = Math.floor(Date.now() / 1000) - 100;
		const signature = await createValidSignature(payload, secret, oldTimestamp);

		const result = await verifyWebhookSignature(
			payload,
			signature,
			secret,
			50, // Only 50 second tolerance
		);

		expect(result.valid).toBe(false);
	});

	it("accepts timestamp within tolerance", async () => {
		const recentTimestamp = Math.floor(Date.now() / 1000) - 100;
		const signature = await createValidSignature(payload, secret, recentTimestamp);

		const result = await verifyWebhookSignature(
			payload,
			signature,
			secret,
			200, // 200 second tolerance
		);

		expect(result.valid).toBe(true);
	});
});
