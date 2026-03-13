import { describe, it, expect } from "vitest";
import { sanitizeStripeWebhookPayload, calculateWebhookExpiry } from "../utils/sanitizer.js";

// Minimal valid Stripe webhook event shape for testing
function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_test_123",
		type: "customer.subscription.updated",
		created: 1700000000,
		livemode: false,
		data: {
			object: {
				id: "sub_abc123",
				object: "subscription",
				customer: "cus_xyz456",
				subscription: "sub_abc123",
				status: "active",
				current_period_start: 1699900000,
				current_period_end: 1702578400,
				cancel_at_period_end: false,
				amount_total: 1200,
				currency: "usd",
				metadata: { tenant_id: "t-123", plan: "seedling" },
				// PII fields — these must be stripped
				email: "user@example.com",
				customer_email: "user@example.com",
				name: "Jane Doe",
				customer_name: "Jane Doe",
				phone: "+15551234567",
				address: { city: "Portland" },
				billing_details: { name: "Jane Doe" },
				receipt_email: "jane@example.com",
				description: "Monthly subscription",
				default_payment_method: "pm_secret",
				hosted_invoice_url: "https://invoice.stripe.com/secret",
			},
		},
		...overrides,
	};
}

describe("sanitizeStripeWebhookPayload", () => {
	describe("PII stripping", () => {
		it("strips customer email", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("email");
			expect(result?.data.object).not.toHaveProperty("customer_email");
		});

		it("strips customer name", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("name");
			expect(result?.data.object).not.toHaveProperty("customer_name");
		});

		it("strips phone number", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("phone");
		});

		it("strips billing address", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("address");
		});

		it("strips billing_details", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("billing_details");
		});

		it("strips receipt_email", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("receipt_email");
		});

		it("strips description", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("description");
		});

		it("strips hosted_invoice_url", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("hosted_invoice_url");
		});

		it("strips default_payment_method", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).not.toHaveProperty("default_payment_method");
		});
	});

	describe("field preservation", () => {
		it("preserves the event id at the top level", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.id).toBe("evt_test_123");
		});

		it("preserves the event type", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.type).toBe("customer.subscription.updated");
		});

		it("preserves the subscription id inside data.object", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object.id).toBe("sub_abc123");
		});

		it("preserves the customer id (not PII — it's an opaque identifier)", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object.customer).toBe("cus_xyz456");
		});

		it("preserves subscription status", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object.status).toBe("active");
		});

		it("preserves metadata (contains our own tenant/plan fields)", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object.metadata).toEqual({
				tenant_id: "t-123",
				plan: "seedling",
			});
		});

		it("preserves financial fields (amount_total, currency)", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object.amount_total).toBe(1200);
			expect(result?.data.object.currency).toBe("usd");
		});

		it("preserves livemode flag", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.livemode).toBe(false);
		});

		it("preserves created timestamp", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.created).toBe(1700000000);
		});
	});

	describe("nested data.object structure", () => {
		it("result has data.object as an object", () => {
			const result = sanitizeStripeWebhookPayload(makeEvent());
			expect(result?.data.object).toBeDefined();
			expect(typeof result?.data.object).toBe("object");
		});

		it("sanitizes subscription line items — keeps price id, strips PII from items", () => {
			const eventWithItems = makeEvent();
			(eventWithItems.data.object as Record<string, unknown>).items = {
				data: [
					{
						id: "si_item1",
						price: {
							id: "price_123",
							product: "prod_abc",
							unit_amount: 1200,
							currency: "usd",
							recurring: { interval: "month" },
							nickname: "Monthly plan",
						},
						quantity: 1,
					},
				],
			};
			const result = sanitizeStripeWebhookPayload(eventWithItems);
			const items = result?.data.object.items as { data: unknown[] } | undefined;
			expect(items?.data).toHaveLength(1);
			const item = items?.data[0] as Record<string, unknown>;
			expect(item.id).toBe("si_item1");
			expect(item.quantity).toBe(1);
			const price = item.price as Record<string, unknown>;
			expect(price.id).toBe("price_123");
			expect(price.product).toBe("prod_abc");
			expect(price.unit_amount).toBe(1200);
			// nickname is not in the price whitelist — should not appear
			expect(price.nickname).toBeUndefined();
		});
	});

	describe("malformed/missing payloads", () => {
		it("returns null for null input", () => {
			expect(sanitizeStripeWebhookPayload(null)).toBeNull();
		});

		it("returns null for undefined input", () => {
			expect(sanitizeStripeWebhookPayload(undefined)).toBeNull();
		});

		it("returns null for a plain string", () => {
			expect(sanitizeStripeWebhookPayload("raw string")).toBeNull();
		});

		it("returns null when id is missing", () => {
			const bad = makeEvent();
			delete (bad as Record<string, unknown>).id;
			expect(sanitizeStripeWebhookPayload(bad)).toBeNull();
		});

		it("returns null when type is missing", () => {
			const bad = makeEvent();
			delete (bad as Record<string, unknown>).type;
			expect(sanitizeStripeWebhookPayload(bad)).toBeNull();
		});

		it("returns null when data is missing", () => {
			const bad = makeEvent();
			delete (bad as Record<string, unknown>).data;
			expect(sanitizeStripeWebhookPayload(bad)).toBeNull();
		});

		it("returns null when data.object is missing", () => {
			const bad = { id: "evt_1", type: "checkout.session.completed", data: {} };
			expect(sanitizeStripeWebhookPayload(bad)).toBeNull();
		});
	});
});

describe("calculateWebhookExpiry", () => {
	it("returns a Unix timestamp approximately 120 days in the future", () => {
		const now = Math.floor(Date.now() / 1000);
		const RETENTION_DAYS = 120;
		const expected = now + RETENTION_DAYS * 24 * 60 * 60;
		const result = calculateWebhookExpiry();

		// Allow ±5 seconds for execution time
		expect(result).toBeGreaterThanOrEqual(expected - 5);
		expect(result).toBeLessThanOrEqual(expected + 5);
	});

	it("returns a value greater than the current time", () => {
		const now = Math.floor(Date.now() / 1000);
		expect(calculateWebhookExpiry()).toBeGreaterThan(now);
	});
});
