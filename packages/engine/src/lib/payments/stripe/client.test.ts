/**
 * Stripe Client Tests
 *
 * Tests for the lightweight Stripe API client covering:
 * - API requests (GET, POST, DELETE)
 * - Parameter encoding
 * - Error handling
 * - Webhook signature verification
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StripeClient, StripeAPIError } from './client';

// ==========================================================================
// Mock Fetch
// ==========================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data: unknown, status = 200) {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => data
	});
}

function mockError(type: string, message: string, status = 400) {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status,
		json: async () => ({ error: { type, message } })
	});
}

// ==========================================================================
// StripeClient Tests
// ==========================================================================

describe('StripeClient', () => {
	let client: StripeClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new StripeClient({ secretKey: 'sk_test_12345' });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// Request Method
	// ==========================================================================

	describe('request', () => {
		describe('GET requests', () => {
			it('should make GET request by default', async () => {
				mockResponse({ id: 'cus_123', email: 'test@example.com' });

				const result = await client.request<{ id: string }>('customers/cus_123');

				expect(result.id).toBe('cus_123');
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('customers/cus_123'),
					expect.objectContaining({ method: 'GET' })
				);
			});

			it('should append params as query string for GET', async () => {
				mockResponse({ data: [] });

				await client.request('customers', {
					params: { limit: 10, email: 'test@example.com' }
				});

				const url = mockFetch.mock.calls[0][0];
				expect(url).toContain('limit=10');
				expect(url).toContain('email=test%40example.com');
			});

			it('should handle nested params in query string', async () => {
				mockResponse({ data: [] });

				await client.request('subscriptions', {
					params: { expand: ['customer', 'items'] }
				});

				const url = mockFetch.mock.calls[0][0];
				expect(url).toContain('expand');
			});
		});

		describe('POST requests', () => {
			it('should make POST request with form-encoded body', async () => {
				mockResponse({ id: 'cus_new' });

				await client.request('customers', {
					method: 'POST',
					params: { email: 'new@example.com', name: 'Test User' }
				});

				const call = mockFetch.mock.calls[0];
				expect(call[1].method).toBe('POST');
				expect(call[1].headers['Content-Type']).toBe(
					'application/x-www-form-urlencoded'
				);
				expect(call[1].body).toContain('email=new%40example.com');
				expect(call[1].body).toContain('name=Test%20User');
			});

			it('should encode nested objects', async () => {
				mockResponse({ id: 'prod_123' });

				await client.request('products', {
					method: 'POST',
					params: {
						name: 'Test',
						metadata: { key1: 'value1', key2: 'value2' }
					}
				});

				const body = mockFetch.mock.calls[0][1].body;
				expect(body).toContain('metadata%5Bkey1%5D=value1');
				expect(body).toContain('metadata%5Bkey2%5D=value2');
			});

			it('should encode arrays', async () => {
				mockResponse({ id: 'cs_123' });

				await client.request('checkout/sessions', {
					method: 'POST',
					params: {
						line_items: [
							{ price: 'price_1', quantity: 2 },
							{ price: 'price_2', quantity: 1 }
						]
					}
				});

				const body = mockFetch.mock.calls[0][1].body;
				expect(body).toContain('line_items');
			});

			it('should skip null and undefined values', async () => {
				mockResponse({ id: 'cus_123' });

				await client.request('customers', {
					method: 'POST',
					params: {
						email: 'test@example.com',
						name: null,
						phone: undefined
					}
				});

				const body = mockFetch.mock.calls[0][1].body;
				expect(body).toContain('email');
				expect(body).not.toContain('name');
				expect(body).not.toContain('phone');
			});
		});

		describe('DELETE requests', () => {
			it('should make DELETE request', async () => {
				mockResponse({ id: 'sub_123', status: 'canceled' });

				await client.request('subscriptions/sub_123', { method: 'DELETE' });

				const call = mockFetch.mock.calls[0];
				expect(call[1].method).toBe('DELETE');
			});
		});

		describe('Headers', () => {
			it('should include Authorization header', async () => {
				mockResponse({ id: 'test' });

				await client.request('test');

				const headers = mockFetch.mock.calls[0][1].headers;
				expect(headers['Authorization']).toBe('Bearer sk_test_12345');
			});

			it('should include Stripe-Version header', async () => {
				mockResponse({ id: 'test' });

				await client.request('test');

				const headers = mockFetch.mock.calls[0][1].headers;
				expect(headers['Stripe-Version']).toBeDefined();
			});

			it('should include custom API version', async () => {
				const customClient = new StripeClient({
					secretKey: 'sk_test',
					apiVersion: '2023-10-16'
				});
				mockResponse({ id: 'test' });

				await customClient.request('test');

				const headers = mockFetch.mock.calls[0][1].headers;
				expect(headers['Stripe-Version']).toBe('2023-10-16');
			});

			it('should include Idempotency-Key when provided', async () => {
				mockResponse({ id: 'cus_123' });

				await client.request('customers', {
					method: 'POST',
					params: { email: 'test@example.com' },
					idempotencyKey: 'unique-key-123'
				});

				const headers = mockFetch.mock.calls[0][1].headers;
				expect(headers['Idempotency-Key']).toBe('unique-key-123');
			});

			it('should include Stripe-Account for Connect', async () => {
				mockResponse({ id: 'acct_123' });

				await client.request('accounts/acct_123', {
					stripeAccount: 'acct_connected'
				});

				const headers = mockFetch.mock.calls[0][1].headers;
				expect(headers['Stripe-Account']).toBe('acct_connected');
			});
		});
	});

	// ==========================================================================
	// Error Handling
	// ==========================================================================

	describe('Error Handling', () => {
		it('should throw StripeAPIError on failure', async () => {
			mockError('card_error', 'Your card was declined', 402);

			await expect(client.request('charges')).rejects.toThrow(StripeAPIError);
		});

		it('should include error details in StripeAPIError', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({
					error: {
						type: 'invalid_request_error',
						message: 'Invalid email',
						param: 'email',
						code: 'parameter_invalid'
					}
				})
			});

			try {
				await client.request('customers', {
					method: 'POST',
					params: { email: 'invalid' }
				});
			} catch (err) {
				expect(err).toBeInstanceOf(StripeAPIError);
				const apiError = err as StripeAPIError;
				expect(apiError.type).toBe('invalid_request_error');
				expect(apiError.message).toBe('Invalid email');
				expect(apiError.param).toBe('email');
				expect(apiError.code).toBe('parameter_invalid');
				expect(apiError.statusCode).toBe(400);
			}
		});

		it('should handle unknown error format', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({})
			});

			try {
				await client.request('test');
			} catch (err) {
				expect(err).toBeInstanceOf(StripeAPIError);
				expect((err as StripeAPIError).message).toBe('Unknown error');
			}
		});
	});

	// ==========================================================================
	// Webhook Signature Verification
	// ==========================================================================

	describe('verifyWebhookSignature', () => {
		it('should reject invalid signature format', async () => {
			const result = await client.verifyWebhookSignature(
				'{"type": "test"}',
				'invalid-signature',
				'whsec_test'
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid signature format');
		});

		it('should reject missing timestamp', async () => {
			const result = await client.verifyWebhookSignature(
				'{"type": "test"}',
				'v1=abc123',
				'whsec_test'
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid signature format');
		});

		it('should reject missing v1 signature', async () => {
			const result = await client.verifyWebhookSignature(
				'{"type": "test"}',
				't=123456',
				'whsec_test'
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('Invalid signature format');
		});

		it('should reject old timestamps', async () => {
			const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago

			const result = await client.verifyWebhookSignature(
				'{"type": "test"}',
				`t=${oldTimestamp},v1=abc123`,
				'whsec_test'
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('too old');
		});

		it('should reject signature mismatch', async () => {
			const timestamp = Math.floor(Date.now() / 1000);

			const result = await client.verifyWebhookSignature(
				'{"type": "test"}',
				`t=${timestamp},v1=invalid_signature`,
				'whsec_test_secret'
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('mismatch');
		});

		it('should accept valid signature', async () => {
			const timestamp = Math.floor(Date.now() / 1000);
			const payload = '{"type": "checkout.session.completed"}';
			const secret = 'whsec_test_secret';

			// Compute the expected signature
			const signedPayload = `${timestamp}.${payload}`;
			const encoder = new TextEncoder();

			const key = await crypto.subtle.importKey(
				'raw',
				encoder.encode(secret),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['sign']
			);

			const signatureBytes = await crypto.subtle.sign(
				'HMAC',
				key,
				encoder.encode(signedPayload)
			);

			const expectedSignature = Array.from(new Uint8Array(signatureBytes))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');

			const result = await client.verifyWebhookSignature(
				payload,
				`t=${timestamp},v1=${expectedSignature}`,
				secret
			);

			expect(result.valid).toBe(true);
			expect(result.event).toEqual({ type: 'checkout.session.completed' });
		});

		it('should respect custom tolerance', async () => {
			const timestamp = Math.floor(Date.now() / 1000) - 200; // 200 seconds ago

			// With default tolerance (300), should fail
			const resultDefault = await client.verifyWebhookSignature(
				'{}',
				`t=${timestamp},v1=abc`,
				'secret'
			);

			// With shorter tolerance (100), should definitely fail
			const resultShort = await client.verifyWebhookSignature(
				'{}',
				`t=${timestamp},v1=abc`,
				'secret',
				100
			);

			expect(resultShort.valid).toBe(false);
			expect(resultShort.error).toContain('too old');
		});
	});
});

// ==========================================================================
// StripeAPIError
// ==========================================================================

describe('StripeAPIError', () => {
	it('should create error with all properties', () => {
		const error = new StripeAPIError(
			{
				type: 'card_error',
				code: 'card_declined',
				message: 'Your card was declined',
				param: 'card_number'
			},
			402
		);

		expect(error.name).toBe('StripeAPIError');
		expect(error.type).toBe('card_error');
		expect(error.code).toBe('card_declined');
		expect(error.message).toBe('Your card was declined');
		expect(error.param).toBe('card_number');
		expect(error.statusCode).toBe(402);
	});

	it('should be an instance of Error', () => {
		const error = new StripeAPIError(
			{ type: 'api_error', message: 'Server error' },
			500
		);

		expect(error).toBeInstanceOf(Error);
	});
});
