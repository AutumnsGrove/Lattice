/**
 * Payment Provider Factory Tests
 *
 * Tests for createPaymentProvider factory function and payment provider initialization.
 */

import { describe, it, expect } from "vitest";
import { createPaymentProvider, StripeProvider, type PaymentProvider } from "./index";

// ===
// PAYMENT PROVIDER FACTORY TESTS
// ===

describe("createPaymentProvider", () => {
	it("creates a Stripe provider instance", () => {
		const provider = createPaymentProvider("stripe", {
			secretKey: "sk_test_1234567890",
		});

		expect(provider).toBeDefined();
		expect(provider.name).toBe("stripe");
	});

	it("returns a provider with all required methods", () => {
		const provider = createPaymentProvider("stripe", {
			secretKey: "sk_test_1234567890",
		});

		// Check that provider has the core methods
		expect(typeof provider.createCheckoutSession).toBe("function");
		expect(typeof provider.getSubscription).toBe("function");
		expect(typeof provider.handleWebhook).toBe("function");
		expect(typeof provider.syncProduct).toBe("function");
		expect(typeof provider.syncPrice).toBe("function");
		expect(typeof provider.archiveProduct).toBe("function");
		expect(typeof provider.getCheckoutSession).toBe("function");
		expect(typeof provider.getPaymentStatus).toBe("function");
		expect(typeof provider.refund).toBe("function");
		expect(typeof provider.cancelSubscription).toBe("function");
		expect(typeof provider.resumeSubscription).toBe("function");
		expect(typeof provider.syncCustomer).toBe("function");
		expect(typeof provider.getCustomer).toBe("function");
		expect(typeof provider.createBillingPortalSession).toBe("function");
	});

	it("throws error when creating Paddle provider", () => {
		expect(() => {
			createPaymentProvider("paddle", {
				secretKey: "pk_test_1234567890",
			});
		}).toThrow("Paddle provider not yet implemented");
	});

	it("throws error for unknown provider type", () => {
		expect(() => {
			createPaymentProvider("unknown" as any, {
				secretKey: "test_key",
			});
		}).toThrow("Unknown payment provider: unknown");
	});

	it("throws error for invalid provider type string", () => {
		expect(() => {
			createPaymentProvider("braintree" as any, {
				secretKey: "test_key",
			});
		}).toThrow("Unknown payment provider: braintree");
	});
});
