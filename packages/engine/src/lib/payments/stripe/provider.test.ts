/**
 * Stripe Provider Tests
 *
 * Tests for the Stripe payment provider covering:
 * - Product and price synchronization
 * - Checkout session creation
 * - Payment status retrieval
 * - Refunds
 * - Subscriptions
 * - Customer management
 * - Webhooks
 * - Stripe Connect
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StripeProvider, createStripeProvider } from './provider';
import { StripeAPIError } from './client';
import type { ProductBase, ProductVariant, CartItem, CheckoutOptions } from '../types';

// ==========================================================================
// Mock Fetch
// ==========================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockStripeResponse(data: unknown, status = 200) {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => data
	});
}

function mockStripeError(type: string, message: string, status = 400) {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status,
		json: async () => ({ error: { type, message } })
	});
}

// ==========================================================================
// Test Data Factories
// ==========================================================================

function createMockProduct(overrides: Partial<ProductBase> = {}): ProductBase {
	return {
		id: 'prod-123',
		tenantId: 'tenant-abc',
		name: 'Test Product',
		description: 'A test product',
		type: 'physical',
		status: 'active',
		images: ['https://example.com/image.jpg'],
		metadata: {},
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

function createMockVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
	return {
		id: 'var-123',
		productId: 'prod-123',
		name: 'Default Variant',
		price: { amount: 1999, currency: 'usd' },
		pricingType: 'one_time',
		inventoryPolicy: 'deny',
		isDefault: true,
		position: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

// ==========================================================================
// StripeProvider Tests
// ==========================================================================

describe('StripeProvider', () => {
	let provider: StripeProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new StripeProvider({
			secretKey: 'sk_test_12345',
			webhookSecret: 'whsec_test_12345'
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// Provider Properties
	// ==========================================================================

	describe('Provider Properties', () => {
		it('should have name "stripe"', () => {
			expect(provider.name).toBe('stripe');
		});
	});

	// ==========================================================================
	// Product & Price Sync
	// ==========================================================================

	describe('syncProduct', () => {
		it('should create a product in Stripe', async () => {
			mockStripeResponse({ id: 'stripe_prod_123' });

			const product = createMockProduct();
			const result = await provider.syncProduct(product);

			expect(result.providerProductId).toBe('stripe_prod_123');
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/products'),
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('should include metadata in product creation', async () => {
			mockStripeResponse({ id: 'stripe_prod_123' });

			const product = createMockProduct({
				metadata: { customField: 'value' }
			});
			await provider.syncProduct(product);

			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('grove_product_id');
			expect(call[1].body).toContain('grove_tenant_id');
		});

		it('should limit images to 8', async () => {
			mockStripeResponse({ id: 'stripe_prod_123' });

			const product = createMockProduct({
				images: Array.from({ length: 10 }, (_, i) => `https://example.com/img${i}.jpg`)
			});
			await provider.syncProduct(product);

			const call = mockFetch.mock.calls[0];
			// Should only include 8 images
			expect((call[1].body.match(/images/g) || []).length).toBeLessThanOrEqual(8);
		});
	});

	describe('syncPrice', () => {
		it('should create a one-time price', async () => {
			mockStripeResponse({ id: 'stripe_price_123' });

			const variant = createMockVariant();
			const result = await provider.syncPrice(variant, 'stripe_prod_123');

			expect(result.providerPriceId).toBe('stripe_price_123');
		});

		it('should create a recurring price for subscriptions', async () => {
			mockStripeResponse({ id: 'stripe_price_sub' });

			const variant = createMockVariant({
				pricingType: 'recurring',
				recurring: { interval: 'month', intervalCount: 1 }
			});
			const result = await provider.syncPrice(variant, 'stripe_prod_123');

			expect(result.providerPriceId).toBe('stripe_price_sub');
			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('recurring');
		});
	});

	describe('archiveProduct', () => {
		it('should deactivate product', async () => {
			mockStripeResponse({ id: 'stripe_prod_123', active: false });

			await provider.archiveProduct('stripe_prod_123');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/products/stripe_prod_123'),
				expect.objectContaining({ method: 'POST' })
			);
		});
	});

	// ==========================================================================
	// Checkout
	// ==========================================================================

	describe('createCheckoutSession', () => {
		const mockResolveVariant = async (variantId: string) => {
			if (variantId === 'missing') return null;
			return createMockVariant({
				id: variantId,
				providerPriceId: 'stripe_price_123'
			});
		};

		it('should create a checkout session', async () => {
			mockStripeResponse({
				id: 'cs_test_123',
				url: 'https://checkout.stripe.com/pay/cs_test_123',
				status: 'open',
				mode: 'payment',
				amount_total: 1999,
				currency: 'usd',
				payment_status: 'unpaid',
				metadata: {},
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const items: CartItem[] = [{ variantId: 'var-123', quantity: 1 }];
			const options: CheckoutOptions = {
				mode: 'payment',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel'
			};

			const result = await provider.createCheckoutSession(
				items,
				options,
				mockResolveVariant
			);

			expect(result.id).toBe('cs_test_123');
			expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
			expect(result.status).toBe('open');
		});

		it('should throw error for missing variant', async () => {
			const items: CartItem[] = [{ variantId: 'missing', quantity: 1 }];
			const options: CheckoutOptions = {
				mode: 'payment',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel'
			};

			await expect(
				provider.createCheckoutSession(items, options, mockResolveVariant)
			).rejects.toThrow('Variant not found');
		});

		it('should create inline price data for variants without provider ID', async () => {
			mockStripeResponse({
				id: 'cs_test_123',
				url: 'https://checkout.stripe.com/pay/cs_test_123',
				status: 'open',
				mode: 'payment',
				amount_total: 2999,
				currency: 'usd',
				payment_status: 'unpaid',
				metadata: {},
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const variantWithoutProvider = createMockVariant({
				providerPriceId: undefined,
				price: { amount: 2999, currency: 'usd' }
			});

			const items: CartItem[] = [{ variantId: 'var-123', quantity: 1 }];
			const options: CheckoutOptions = {
				mode: 'payment',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel'
			};

			await provider.createCheckoutSession(
				items,
				options,
				async () => variantWithoutProvider
			);

			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('price_data');
		});

		it('should support subscription mode with trial', async () => {
			mockStripeResponse({
				id: 'cs_sub_123',
				url: 'https://checkout.stripe.com/pay/cs_sub_123',
				status: 'open',
				mode: 'subscription',
				amount_total: 999,
				currency: 'usd',
				payment_status: 'unpaid',
				metadata: {},
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const items: CartItem[] = [{ variantId: 'var-123', quantity: 1 }];
			const options: CheckoutOptions = {
				mode: 'subscription',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel',
				trialPeriodDays: 14
			};

			await provider.createCheckoutSession(items, options, mockResolveVariant);

			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('subscription_data');
			expect(call[1].body).toContain('trial_period_days');
		});

		it('should include Connect account for marketplace', async () => {
			mockStripeResponse({
				id: 'cs_connect_123',
				url: 'https://checkout.stripe.com/pay/cs_connect_123',
				status: 'open',
				mode: 'payment',
				amount_total: 1999,
				currency: 'usd',
				payment_status: 'unpaid',
				metadata: {},
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const items: CartItem[] = [{ variantId: 'var-123', quantity: 1 }];
			const options: CheckoutOptions = {
				mode: 'payment',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel',
				connectedAccountId: 'acct_connected123',
				applicationFeeAmount: 200
			};

			await provider.createCheckoutSession(items, options, mockResolveVariant);

			const call = mockFetch.mock.calls[0];
			expect(call[1].headers['Stripe-Account']).toBe('acct_connected123');
		});
	});

	describe('getCheckoutSession', () => {
		it('should retrieve checkout session', async () => {
			mockStripeResponse({
				id: 'cs_test_123',
				url: 'https://checkout.stripe.com/pay/cs_test_123',
				status: 'complete',
				mode: 'payment',
				customer: 'cus_123',
				amount_total: 1999,
				currency: 'usd',
				payment_status: 'paid',
				metadata: {},
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const result = await provider.getCheckoutSession('cs_test_123');

			expect(result?.id).toBe('cs_test_123');
			expect(result?.status).toBe('complete');
			expect(result?.paymentStatus).toBe('paid');
		});

		it('should return null for non-existent session', async () => {
			mockStripeError('invalid_request_error', 'No such checkout session', 404);

			const result = await provider.getCheckoutSession('cs_nonexistent');

			expect(result).toBeNull();
		});
	});

	// ==========================================================================
	// Payments
	// ==========================================================================

	describe('getPaymentStatus', () => {
		it('should map Stripe payment intent status', async () => {
			mockStripeResponse({ status: 'succeeded' });

			const status = await provider.getPaymentStatus('pi_123');

			expect(status).toBe('succeeded');
		});

		it('should map processing status', async () => {
			mockStripeResponse({ status: 'processing' });

			const status = await provider.getPaymentStatus('pi_123');

			expect(status).toBe('processing');
		});

		it('should map requires_action to pending', async () => {
			mockStripeResponse({ status: 'requires_action' });

			const status = await provider.getPaymentStatus('pi_123');

			expect(status).toBe('pending');
		});
	});

	describe('refund', () => {
		it('should create a refund', async () => {
			mockStripeResponse({
				id: 're_123',
				amount: 1999,
				currency: 'usd',
				status: 'succeeded',
				reason: 'requested_by_customer',
				created: Math.floor(Date.now() / 1000)
			});

			const result = await provider.refund(
				{ orderId: 'order-123', reason: 'requested_by_customer' },
				'pi_123'
			);

			expect(result.id).toBe('re_123');
			expect(result.status).toBe('succeeded');
			expect(result.providerRefundId).toBe('re_123');
		});

		it('should create partial refund', async () => {
			mockStripeResponse({
				id: 're_partial',
				amount: 500,
				currency: 'usd',
				status: 'succeeded',
				created: Math.floor(Date.now() / 1000)
			});

			const result = await provider.refund(
				{ orderId: 'order-123', amount: 500 },
				'pi_123'
			);

			expect(result.amount.amount).toBe(500);
		});
	});

	// ==========================================================================
	// Subscriptions
	// ==========================================================================

	describe('getSubscription', () => {
		it('should retrieve subscription', async () => {
			mockStripeResponse({
				id: 'sub_123',
				status: 'active',
				customer: 'cus_123',
				items: {
					data: [{ id: 'si_123', quantity: 1, price: { id: 'price_123' } }]
				},
				current_period_start: Math.floor(Date.now() / 1000) - 86400,
				current_period_end: Math.floor(Date.now() / 1000) + 86400 * 29,
				cancel_at_period_end: false,
				metadata: {},
				created: Math.floor(Date.now() / 1000) - 86400
			});

			const result = await provider.getSubscription('sub_123');

			expect(result?.id).toBe('sub_123');
			expect(result?.status).toBe('active');
		});

		it('should return null for non-existent subscription', async () => {
			mockStripeError('resource_missing', 'No such subscription', 404);

			const result = await provider.getSubscription('sub_nonexistent');

			expect(result).toBeNull();
		});

		it('should map subscription statuses correctly', async () => {
			const statusTests = [
				{ stripe: 'trialing', expected: 'trialing' },
				{ stripe: 'active', expected: 'active' },
				{ stripe: 'past_due', expected: 'past_due' },
				{ stripe: 'canceled', expected: 'canceled' },
				{ stripe: 'unpaid', expected: 'unpaid' },
				{ stripe: 'paused', expected: 'paused' }
			];

			for (const test of statusTests) {
				mockStripeResponse({
					id: 'sub_test',
					status: test.stripe,
					customer: 'cus_123',
					items: { data: [{ id: 'si', quantity: 1 }] },
					current_period_start: 0,
					current_period_end: 0,
					cancel_at_period_end: false,
					metadata: {},
					created: 0
				});

				const result = await provider.getSubscription('sub_test');
				expect(result?.status).toBe(test.expected);
			}
		});
	});

	describe('cancelSubscription', () => {
		it('should cancel at period end by default', async () => {
			mockStripeResponse({ id: 'sub_123', cancel_at_period_end: true });

			await provider.cancelSubscription('sub_123');

			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('cancel_at_period_end');
		});

		it('should cancel immediately when requested', async () => {
			mockStripeResponse({ id: 'sub_123', status: 'canceled' });

			await provider.cancelSubscription('sub_123', true);

			const call = mockFetch.mock.calls[0];
			expect(call[1].method).toBe('DELETE');
		});
	});

	describe('resumeSubscription', () => {
		it('should resume canceled subscription', async () => {
			mockStripeResponse({ id: 'sub_123', cancel_at_period_end: false });

			await provider.resumeSubscription('sub_123');

			const call = mockFetch.mock.calls[0];
			expect(call[1].body).toContain('cancel_at_period_end');
		});
	});

	// ==========================================================================
	// Customers
	// ==========================================================================

	describe('syncCustomer', () => {
		it('should create new customer', async () => {
			mockStripeResponse({ id: 'cus_new123' });

			const result = await provider.syncCustomer({
				id: 'local-123',
				tenantId: 'tenant-abc',
				email: 'customer@example.com',
				name: 'Test Customer'
			});

			expect(result.providerCustomerId).toBe('cus_new123');
		});

		it('should update existing customer', async () => {
			mockStripeResponse({ id: 'cus_existing' });

			const result = await provider.syncCustomer({
				id: 'local-123',
				tenantId: 'tenant-abc',
				email: 'updated@example.com',
				providerCustomerId: 'cus_existing'
			});

			expect(result.providerCustomerId).toBe('cus_existing');
			const call = mockFetch.mock.calls[0];
			expect(call[0]).toContain('/customers/cus_existing');
		});
	});

	describe('getCustomer', () => {
		it('should retrieve customer', async () => {
			mockStripeResponse({
				id: 'cus_123',
				email: 'customer@example.com',
				name: 'Test Customer',
				metadata: { grove_customer_id: 'local-123' },
				created: Math.floor(Date.now() / 1000)
			});

			const result = await provider.getCustomer('cus_123');

			expect(result?.email).toBe('customer@example.com');
			expect(result?.providerCustomerId).toBe('cus_123');
		});

		it('should return null for non-existent customer', async () => {
			mockStripeError('resource_missing', 'No such customer', 404);

			const result = await provider.getCustomer('cus_nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('createBillingPortalSession', () => {
		it('should create billing portal session', async () => {
			mockStripeResponse({
				id: 'bps_123',
				url: 'https://billing.stripe.com/session/bps_123'
			});

			const result = await provider.createBillingPortalSession(
				'cus_123',
				'https://example.com/account'
			);

			expect(result.url).toBe('https://billing.stripe.com/session/bps_123');
		});
	});

	// ==========================================================================
	// Webhooks
	// ==========================================================================

	describe('handleWebhook', () => {
		it('should reject missing signature', async () => {
			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				body: JSON.stringify({ type: 'test' })
			});

			const result = await provider.handleWebhook(request);

			expect(result.received).toBe(false);
			expect(result.error).toContain('Missing');
		});

		it('should reject when webhook secret not configured', async () => {
			const providerNoSecret = new StripeProvider({
				secretKey: 'sk_test_123'
				// No webhookSecret
			});

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: { 'stripe-signature': 't=123,v1=abc' },
				body: JSON.stringify({ type: 'test' })
			});

			const result = await providerNoSecret.handleWebhook(request);

			expect(result.received).toBe(false);
			expect(result.error).toContain('not configured');
		});
	});

	// ==========================================================================
	// Stripe Connect
	// ==========================================================================

	describe('createConnectAccount', () => {
		it('should create Connect account with onboarding link', async () => {
			mockStripeResponse({ id: 'acct_connect123' });
			mockStripeResponse({
				url: 'https://connect.stripe.com/setup/acct_connect123',
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const result = await provider.createConnectAccount({
				tenantId: 'tenant-abc',
				email: 'merchant@example.com',
				refreshUrl: 'https://example.com/refresh',
				returnUrl: 'https://example.com/return'
			});

			expect(result.accountId).toBe('acct_connect123');
			expect(result.onboardingUrl).toContain('connect.stripe.com');
		});
	});

	describe('getConnectAccount', () => {
		it('should retrieve Connect account', async () => {
			mockStripeResponse({
				id: 'acct_connect123',
				charges_enabled: true,
				payouts_enabled: true,
				details_submitted: true,
				email: 'merchant@example.com',
				country: 'US',
				default_currency: 'usd',
				created: Math.floor(Date.now() / 1000)
			});

			const result = await provider.getConnectAccount('acct_connect123');

			expect(result?.id).toBe('acct_connect123');
			expect(result?.status).toBe('enabled');
			expect(result?.chargesEnabled).toBe(true);
		});

		it('should map account status correctly', async () => {
			// Pending - not submitted
			mockStripeResponse({
				id: 'acct_1',
				charges_enabled: false,
				payouts_enabled: false,
				details_submitted: false,
				created: 0
			});
			let result = await provider.getConnectAccount('acct_1');
			expect(result?.status).toBe('pending');

			// Restricted - submitted but not enabled
			mockStripeResponse({
				id: 'acct_2',
				charges_enabled: false,
				payouts_enabled: false,
				details_submitted: true,
				created: 0
			});
			result = await provider.getConnectAccount('acct_2');
			expect(result?.status).toBe('restricted');
		});

		it('should return null for non-existent account', async () => {
			mockStripeError('resource_missing', 'No such account', 404);

			const result = await provider.getConnectAccount('acct_nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('createConnectAccountLink', () => {
		it('should create onboarding link for existing account', async () => {
			mockStripeResponse({
				url: 'https://connect.stripe.com/setup/acct_123',
				expires_at: Math.floor(Date.now() / 1000) + 3600
			});

			const result = await provider.createConnectAccountLink('acct_123', {
				refreshUrl: 'https://example.com/refresh',
				returnUrl: 'https://example.com/return'
			});

			expect(result.url).toContain('connect.stripe.com');
			expect(result.expiresAt).toBeInstanceOf(Date);
		});
	});

	describe('createConnectLoginLink', () => {
		it('should create Express dashboard login link', async () => {
			mockStripeResponse({
				url: 'https://connect.stripe.com/express/acct_123/login'
			});

			const result = await provider.createConnectLoginLink('acct_123');

			expect(result.url).toContain('connect.stripe.com');
		});
	});
});

// ==========================================================================
// Factory Function
// ==========================================================================

describe('createStripeProvider', () => {
	it('should create a StripeProvider instance', () => {
		const provider = createStripeProvider({
			secretKey: 'sk_test_123'
		});

		expect(provider).toBeInstanceOf(StripeProvider);
		expect(provider.name).toBe('stripe');
	});
});
