/**
 * Tests for Rate Limit Middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, rateLimitHeaders, buildRateLimitKey } from './middleware.js';
import { createMockKV } from './test-utils.js';

describe('checkRateLimit', () => {
	let mockKV: KVNamespace;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockKV = createMockKV();
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('allows requests under limit', async () => {
		const { result, response } = await checkRateLimit({
			kv: mockKV,
			key: 'test:user1',
			limit: 10,
			windowSeconds: 60
		});

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(9);
		expect(response).toBeUndefined();
	});

	it('returns 429 response when limit exceeded', async () => {
		// Make requests up to the limit
		for (let i = 0; i < 5; i++) {
			await checkRateLimit({
				kv: mockKV,
				key: 'test:user2',
				limit: 5,
				windowSeconds: 60
			});
		}

		// Next request should be rate limited
		const { result, response } = await checkRateLimit({
			kv: mockKV,
			key: 'test:user2',
			limit: 5,
			windowSeconds: 60
		});

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
		expect(response).toBeDefined();
		expect(response!.status).toBe(429);
	});

	it('includes proper headers in 429 response', async () => {
		// Exhaust the limit
		for (let i = 0; i < 3; i++) {
			await checkRateLimit({
				kv: mockKV,
				key: 'test:user3',
				limit: 3,
				windowSeconds: 60
			});
		}

		const { response } = await checkRateLimit({
			kv: mockKV,
			key: 'test:user3',
			limit: 3,
			windowSeconds: 60
		});

		expect(response).toBeDefined();
		expect(response!.headers.get('Retry-After')).toBeDefined();
		expect(response!.headers.get('X-RateLimit-Limit')).toBe('3');
		expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
		expect(response!.headers.get('X-RateLimit-Reset')).toBeDefined();
	});

	it('returns JSON body with error details', async () => {
		// Exhaust the limit
		for (let i = 0; i < 2; i++) {
			await checkRateLimit({
				kv: mockKV,
				key: 'test:user4',
				limit: 2,
				windowSeconds: 60
			});
		}

		const { response } = await checkRateLimit({
			kv: mockKV,
			key: 'test:user4',
			limit: 2,
			windowSeconds: 60
		});

		expect(response).toBeDefined();
		const body = await response!.json();
		expect(body.error).toBe('rate_limited');
		expect(body.message).toContain('moving faster than we can keep up');
		expect(body.retryAfter).toBeTypeOf('number');
		expect(body.resetAt).toBeDefined();
	});

	it('fails open on KV errors', async () => {
		// Create a KV that always throws
		const errorKV = {
			...mockKV,
			get: vi.fn().mockRejectedValue(new Error('KV unavailable'))
		} as unknown as KVNamespace;

		const { result, response } = await checkRateLimit({
			kv: errorKV,
			key: 'test:user5',
			limit: 5,
			windowSeconds: 60
		});

		// Should allow request despite KV error
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(5);
		expect(response).toBeUndefined();

		// Should log the error
		expect(consoleErrorSpy).toHaveBeenCalled();
	});

	it('uses namespace when provided', async () => {
		await checkRateLimit({
			kv: mockKV,
			key: 'test:user6',
			limit: 10,
			windowSeconds: 60,
			namespace: 'custom-namespace'
		});

		expect(mockKV.get).toHaveBeenCalledWith(
			expect.stringContaining('custom-namespace'),
			expect.anything()
		);
	});
});

describe('rateLimitHeaders', () => {
	it('returns correct header values', () => {
		const result = {
			allowed: true,
			remaining: 5,
			resetAt: 1704067200
		};

		const headers = rateLimitHeaders(result, 10);

		expect(headers['X-RateLimit-Limit']).toBe('10');
		expect(headers['X-RateLimit-Remaining']).toBe('5');
		expect(headers['X-RateLimit-Reset']).toBe('1704067200');
	});

	it('works with zero remaining', () => {
		const result = {
			allowed: false,
			remaining: 0,
			resetAt: 1704067200
		};

		const headers = rateLimitHeaders(result, 100);

		expect(headers['X-RateLimit-Remaining']).toBe('0');
	});
});

describe('buildRateLimitKey', () => {
	it('combines endpoint and identifier', () => {
		expect(buildRateLimitKey('posts/create', 'user123')).toBe('posts/create:user123');
		expect(buildRateLimitKey('auth/login', '192.168.1.1')).toBe('auth/login:192.168.1.1');
	});

	it('handles special characters', () => {
		expect(buildRateLimitKey('api/v1', 'user@example.com')).toBe('api/v1:user@example.com');
	});
});
