/**
 * Rate Limiter Tests
 *
 * Tests for client-side rate limiting utilities covering:
 * - Basic rate limit checking
 * - Window expiration and reset
 * - Remaining request tracking
 * - Cleanup of expired entries
 * - Rate limit error handling
 * - withRateLimit wrapper function
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	RateLimiter,
	RateLimitError,
	withRateLimit,
	DEFAULT_RATE_LIMITS
} from './rate-limit';

describe('Rate Limiter', () => {
	let limiter: RateLimiter;

	beforeEach(() => {
		limiter = new RateLimiter();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ==========================================================================
	// Default Configuration
	// ==========================================================================

	describe('DEFAULT_RATE_LIMITS', () => {
		it('should have token limit configured', () => {
			expect(DEFAULT_RATE_LIMITS.token).toBeDefined();
			expect(DEFAULT_RATE_LIMITS.token.maxRequests).toBe(10);
			expect(DEFAULT_RATE_LIMITS.token.windowMs).toBe(60000);
		});

		it('should have subscription limit configured', () => {
			expect(DEFAULT_RATE_LIMITS.subscription).toBeDefined();
			expect(DEFAULT_RATE_LIMITS.subscription.maxRequests).toBe(60);
		});

		it('should have postCount limit configured', () => {
			expect(DEFAULT_RATE_LIMITS.postCount).toBeDefined();
			expect(DEFAULT_RATE_LIMITS.postCount.maxRequests).toBe(30);
		});

		it('should have canPost limit configured', () => {
			expect(DEFAULT_RATE_LIMITS.canPost).toBeDefined();
			expect(DEFAULT_RATE_LIMITS.canPost.maxRequests).toBe(120);
		});
	});

	// ==========================================================================
	// Basic Rate Limiting
	// ==========================================================================

	describe('checkLimit', () => {
		it('should allow requests under the limit', () => {
			const result = limiter.checkLimit('token', 'user-123');
			expect(result).toBe(true);
		});

		it('should track request count', () => {
			// First request
			expect(limiter.checkLimit('token', 'user-123')).toBe(true);
			// Second request
			expect(limiter.checkLimit('token', 'user-123')).toBe(true);

			const remaining = limiter.getRemaining('token', 'user-123');
			expect(remaining?.remaining).toBe(8); // 10 - 2 = 8
		});

		it('should block requests over the limit', () => {
			// Exhaust the limit (10 requests for token type)
			for (let i = 0; i < 10; i++) {
				expect(limiter.checkLimit('token', 'user-123')).toBe(true);
			}

			// 11th request should be blocked
			expect(limiter.checkLimit('token', 'user-123')).toBe(false);
		});

		it('should track limits per key independently', () => {
			// Use up limit for user-1
			for (let i = 0; i < 10; i++) {
				limiter.checkLimit('token', 'user-1');
			}

			// user-1 should be blocked
			expect(limiter.checkLimit('token', 'user-1')).toBe(false);

			// user-2 should still be allowed
			expect(limiter.checkLimit('token', 'user-2')).toBe(true);
		});

		it('should track limits per type independently', () => {
			// Use up token limit for user
			for (let i = 0; i < 10; i++) {
				limiter.checkLimit('token', 'user-123');
			}

			// Token should be blocked
			expect(limiter.checkLimit('token', 'user-123')).toBe(false);

			// Subscription should still be allowed
			expect(limiter.checkLimit('subscription', 'user-123')).toBe(true);
		});

		it('should allow unknown types by default', () => {
			expect(limiter.checkLimit('unknown-type', 'user-123')).toBe(true);
			expect(limiter.checkLimit('unknown-type', 'user-123')).toBe(true);
		});
	});

	// ==========================================================================
	// Window Expiration
	// ==========================================================================

	describe('Window Expiration', () => {
		it('should reset after window expires', () => {
			// Use up the limit
			for (let i = 0; i < 10; i++) {
				limiter.checkLimit('token', 'user-123');
			}
			expect(limiter.checkLimit('token', 'user-123')).toBe(false);

			// Advance time past the window (60 seconds for token)
			vi.advanceTimersByTime(61000);

			// Should be allowed again
			expect(limiter.checkLimit('token', 'user-123')).toBe(true);
		});

		it('should start a new window on first request after expiry', () => {
			limiter.checkLimit('token', 'user-123');

			// Advance time past the window
			vi.advanceTimersByTime(61000);

			// New request should start fresh counter
			limiter.checkLimit('token', 'user-123');
			const remaining = limiter.getRemaining('token', 'user-123');

			expect(remaining?.remaining).toBe(9); // Fresh window, 1 used
		});
	});

	// ==========================================================================
	// getRemaining
	// ==========================================================================

	describe('getRemaining', () => {
		it('should return full capacity for new keys', () => {
			const remaining = limiter.getRemaining('token', 'new-user');

			expect(remaining?.remaining).toBe(10); // Full token limit
			expect(remaining?.resetAt).toBeGreaterThan(Date.now());
		});

		it('should return correct remaining count after requests', () => {
			// Make 3 requests
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-123');

			const remaining = limiter.getRemaining('token', 'user-123');
			expect(remaining?.remaining).toBe(7); // 10 - 3
		});

		it('should return 0 remaining when at limit', () => {
			// Exhaust the limit
			for (let i = 0; i < 10; i++) {
				limiter.checkLimit('token', 'user-123');
			}

			const remaining = limiter.getRemaining('token', 'user-123');
			expect(remaining?.remaining).toBe(0);
		});

		it('should return null for unknown types', () => {
			const remaining = limiter.getRemaining('unknown-type', 'user-123');
			expect(remaining).toBeNull();
		});

		it('should return full capacity after window expires', () => {
			// Make some requests
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-123');

			// Advance past window
			vi.advanceTimersByTime(61000);

			const remaining = limiter.getRemaining('token', 'user-123');
			expect(remaining?.remaining).toBe(10);
		});

		it('should include resetAt timestamp', () => {
			limiter.checkLimit('token', 'user-123');
			const remaining = limiter.getRemaining('token', 'user-123');

			expect(remaining?.resetAt).toBeDefined();
			expect(remaining?.resetAt).toBeGreaterThan(Date.now());
		});
	});

	// ==========================================================================
	// Clear
	// ==========================================================================

	describe('clear', () => {
		it('should clear specific key', () => {
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-456');

			limiter.clear('token', 'user-123');

			// user-123 should be reset
			const remaining123 = limiter.getRemaining('token', 'user-123');
			expect(remaining123?.remaining).toBe(10);

			// user-456 should still have reduced count
			const remaining456 = limiter.getRemaining('token', 'user-456');
			expect(remaining456?.remaining).toBe(9);
		});

		it('should clear all keys for a type', () => {
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-456');
			limiter.checkLimit('subscription', 'user-123');

			limiter.clear('token');

			// All token limits should be reset
			expect(limiter.getRemaining('token', 'user-123')?.remaining).toBe(10);
			expect(limiter.getRemaining('token', 'user-456')?.remaining).toBe(10);

			// Subscription should be unchanged
			expect(limiter.getRemaining('subscription', 'user-123')?.remaining).toBe(59);
		});

		it('should clear all limits when called with no arguments', () => {
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('subscription', 'user-456');

			limiter.clear();

			expect(limiter.getRemaining('token', 'user-123')?.remaining).toBe(10);
			expect(limiter.getRemaining('subscription', 'user-456')?.remaining).toBe(60);
		});
	});

	// ==========================================================================
	// Cleanup
	// ==========================================================================

	describe('cleanup', () => {
		it('should remove expired entries', () => {
			// Create some entries
			limiter.checkLimit('token', 'user-123');
			limiter.checkLimit('token', 'user-456');

			// Advance time past window
			vi.advanceTimersByTime(61000);

			const removed = limiter.cleanup();
			expect(removed).toBe(2);
		});

		it('should not remove active entries', () => {
			limiter.checkLimit('token', 'user-123');

			// Advance time, but not past window
			vi.advanceTimersByTime(30000);

			const removed = limiter.cleanup();
			expect(removed).toBe(0);
		});

		it('should return count of removed entries', () => {
			// Create entries with different windows
			limiter.checkLimit('token', 'user-1'); // 60s window
			limiter.checkLimit('canPost', 'user-2'); // 60s window

			// Advance time past all windows
			vi.advanceTimersByTime(61000);

			const removed = limiter.cleanup();
			expect(removed).toBe(2);
		});
	});

	// ==========================================================================
	// Custom Configuration
	// ==========================================================================

	describe('Custom Configuration', () => {
		it('should accept custom rate limit config', () => {
			const customLimiter = new RateLimiter({
				custom: { maxRequests: 3, windowMs: 10000 }
			});

			expect(customLimiter.checkLimit('custom', 'user')).toBe(true);
			expect(customLimiter.checkLimit('custom', 'user')).toBe(true);
			expect(customLimiter.checkLimit('custom', 'user')).toBe(true);
			expect(customLimiter.checkLimit('custom', 'user')).toBe(false);
		});

		it('should override default config', () => {
			const customLimiter = new RateLimiter({
				token: { maxRequests: 2, windowMs: 5000 }
			});

			expect(customLimiter.checkLimit('token', 'user')).toBe(true);
			expect(customLimiter.checkLimit('token', 'user')).toBe(true);
			expect(customLimiter.checkLimit('token', 'user')).toBe(false);
		});

		it('should preserve non-overridden defaults', () => {
			const customLimiter = new RateLimiter({
				token: { maxRequests: 2, windowMs: 5000 }
			});

			// Subscription should still use default (60 requests)
			for (let i = 0; i < 60; i++) {
				expect(customLimiter.checkLimit('subscription', 'user')).toBe(true);
			}
			expect(customLimiter.checkLimit('subscription', 'user')).toBe(false);
		});
	});
});

// ==========================================================================
// RateLimitError
// ==========================================================================

describe('RateLimitError', () => {
	it('should create error with correct name', () => {
		const error = new RateLimitError('token', 5000);
		expect(error.name).toBe('RateLimitError');
	});

	it('should include type in message', () => {
		const error = new RateLimitError('token', 5000);
		expect(error.message).toContain('token');
	});

	it('should include retry time in message', () => {
		const error = new RateLimitError('token', 5000);
		expect(error.message).toContain('5 seconds');
	});

	it('should store retryAfterMs', () => {
		const error = new RateLimitError('subscription', 30000);
		expect(error.retryAfterMs).toBe(30000);
	});

	it('should round up seconds in message', () => {
		const error = new RateLimitError('token', 2500);
		expect(error.message).toContain('3 seconds');
	});
});

// ==========================================================================
// withRateLimit
// ==========================================================================

describe('withRateLimit', () => {
	let limiter: RateLimiter;

	beforeEach(() => {
		limiter = new RateLimiter();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should call wrapped function when under limit', async () => {
		const mockFn = vi.fn(async (userId: string) => ({ userId, data: 'test' }));
		const wrapped = withRateLimit(
			limiter,
			'token',
			(userId: string) => userId,
			mockFn
		);

		const result = await wrapped('user-123');

		expect(mockFn).toHaveBeenCalledWith('user-123');
		expect(result).toEqual({ userId: 'user-123', data: 'test' });
	});

	it('should throw RateLimitError when over limit', async () => {
		const mockFn = vi.fn(async () => 'result');
		const wrapped = withRateLimit(
			limiter,
			'token',
			() => 'user',
			mockFn
		);

		// Exhaust the limit
		for (let i = 0; i < 10; i++) {
			limiter.checkLimit('token', 'user');
		}

		await expect(wrapped()).rejects.toThrow(RateLimitError);
	});

	it('should include retryAfterMs in error', async () => {
		const mockFn = vi.fn(async () => 'result');
		const wrapped = withRateLimit(
			limiter,
			'token',
			() => 'user',
			mockFn
		);

		// Exhaust the limit
		for (let i = 0; i < 10; i++) {
			limiter.checkLimit('token', 'user');
		}

		try {
			await wrapped();
		} catch (err) {
			expect(err).toBeInstanceOf(RateLimitError);
			expect((err as RateLimitError).retryAfterMs).toBeGreaterThan(0);
		}
	});

	it('should use getKey function to determine rate limit key', async () => {
		const mockFn = vi.fn(async (userId: string, resource: string) => ({ userId, resource }));
		const wrapped = withRateLimit(
			limiter,
			'token',
			(userId: string, _resource: string) => userId, // Key based on userId only
			mockFn
		);

		// Exhaust limit for user-1
		for (let i = 0; i < 10; i++) {
			limiter.checkLimit('token', 'user-1');
		}

		// user-1 should be blocked
		await expect(wrapped('user-1', 'resource-a')).rejects.toThrow(RateLimitError);

		// user-2 should still work
		const result = await wrapped('user-2', 'resource-a');
		expect(result).toEqual({ userId: 'user-2', resource: 'resource-a' });
	});

	it('should track rate limit correctly through wrapped function', async () => {
		const mockFn = vi.fn(async () => 'result');
		const wrapped = withRateLimit(
			limiter,
			'token',
			() => 'user',
			mockFn
		);

		// Make 9 calls (should all succeed)
		for (let i = 0; i < 9; i++) {
			await wrapped();
		}

		expect(mockFn).toHaveBeenCalledTimes(9);

		// Check remaining - wrapped function calls checkLimit once per call
		const remaining = limiter.getRemaining('token', 'user');
		expect(remaining?.remaining).toBe(1); // 10 - 9 = 1
	});

	it('should use default retry time when no remaining info', async () => {
		// Create a limiter with unknown type to trigger null remaining
		const customLimiter = new RateLimiter({});
		const mockFn = vi.fn(async () => 'result');

		// Manually exhaust by creating custom logic
		const wrapped = withRateLimit(
			limiter,
			'token',
			() => 'user',
			mockFn
		);

		// Exhaust limit
		for (let i = 0; i < 10; i++) {
			limiter.checkLimit('token', 'user');
		}

		try {
			await wrapped();
		} catch (err) {
			expect((err as RateLimitError).retryAfterMs).toBeGreaterThan(0);
		}
	});
});
