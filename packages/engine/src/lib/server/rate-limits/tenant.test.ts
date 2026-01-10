/**
 * Tests for Tenant Rate Limiting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	checkTenantRateLimit,
	categorizeRequest,
	getTenantLimitInfo,
	formatLimit
} from './tenant.js';
import { TIER_RATE_LIMITS } from './config.js';
import { createMockKV } from './test-utils.js';

describe('checkTenantRateLimit', () => {
	let mockKV: KVNamespace;

	beforeEach(() => {
		mockKV = createMockKV();
	});

	it('applies correct tier limits for seedling', async () => {
		const result = await checkTenantRateLimit(mockKV, 'tenant1', 'seedling', 'requests');

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(TIER_RATE_LIMITS.seedling.requests.limit - 1);
	});

	it('applies correct tier limits for oak', async () => {
		const result = await checkTenantRateLimit(mockKV, 'tenant2', 'oak', 'ai');

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(TIER_RATE_LIMITS.oak.ai.limit - 1);
	});

	it('enforces limits across multiple calls', async () => {
		// Make requests up to the limit (seedling writes = 50)
		for (let i = 0; i < 50; i++) {
			await checkTenantRateLimit(mockKV, 'tenant3', 'seedling', 'writes');
		}

		// Next request should be denied
		const result = await checkTenantRateLimit(mockKV, 'tenant3', 'seedling', 'writes');
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('uses namespaced key for each tenant', async () => {
		await checkTenantRateLimit(mockKV, 'alice', 'seedling', 'requests');
		await checkTenantRateLimit(mockKV, 'bob', 'seedling', 'requests');

		// Each tenant should have their own remaining count
		const aliceResult = await checkTenantRateLimit(mockKV, 'alice', 'seedling', 'requests');
		const bobResult = await checkTenantRateLimit(mockKV, 'bob', 'seedling', 'requests');

		expect(aliceResult.remaining).toBe(TIER_RATE_LIMITS.seedling.requests.limit - 2);
		expect(bobResult.remaining).toBe(TIER_RATE_LIMITS.seedling.requests.limit - 2);
	});
});

describe('categorizeRequest', () => {
	it('categorizes AI endpoints', () => {
		expect(categorizeRequest('POST', '/api/ai/wisp')).toBe('ai');
		expect(categorizeRequest('POST', '/api/ai/fireside')).toBe('ai');
		expect(categorizeRequest('POST', '/api/wisp')).toBe('ai');
		expect(categorizeRequest('POST', '/api/grove/wisp')).toBe('ai');
	});

	it('categorizes upload endpoints', () => {
		expect(categorizeRequest('POST', '/api/upload')).toBe('uploads');
		expect(categorizeRequest('POST', '/api/images')).toBe('uploads');
		expect(categorizeRequest('POST', '/api/cdn/upload')).toBe('uploads');
	});

	it('categorizes write operations', () => {
		expect(categorizeRequest('POST', '/api/posts')).toBe('writes');
		expect(categorizeRequest('PUT', '/api/posts/123')).toBe('writes');
		expect(categorizeRequest('PATCH', '/api/settings')).toBe('writes');
		expect(categorizeRequest('DELETE', '/api/posts/123')).toBe('writes');
	});

	it('categorizes reads as requests', () => {
		expect(categorizeRequest('GET', '/api/posts')).toBe('requests');
		expect(categorizeRequest('GET', '/api/users/123')).toBe('requests');
		expect(categorizeRequest('HEAD', '/api/health')).toBe('requests');
	});

	it('prioritizes AI over write for AI endpoints', () => {
		// POST to AI endpoint should be 'ai', not 'writes'
		expect(categorizeRequest('POST', '/api/ai/draft')).toBe('ai');
	});
});

describe('getTenantLimitInfo', () => {
	it('returns all limits for a tier', () => {
		const seedlingLimits = getTenantLimitInfo('seedling');

		expect(seedlingLimits.requests).toEqual({ limit: 100, windowSeconds: 60 });
		expect(seedlingLimits.writes).toEqual({ limit: 50, windowSeconds: 3600 });
		expect(seedlingLimits.uploads).toEqual({ limit: 10, windowSeconds: 86400 });
		expect(seedlingLimits.ai).toEqual({ limit: 25, windowSeconds: 86400 });
	});

	it('returns different limits for different tiers', () => {
		const seedlingLimits = getTenantLimitInfo('seedling');
		const evergreenLimits = getTenantLimitInfo('evergreen');

		expect(evergreenLimits.requests.limit).toBeGreaterThan(seedlingLimits.requests.limit);
		expect(evergreenLimits.ai.limit).toBeGreaterThan(seedlingLimits.ai.limit);
	});
});

describe('formatLimit', () => {
	it('formats per minute limits', () => {
		expect(formatLimit(100, 60)).toBe('100 per minute');
		expect(formatLimit(50, 30)).toBe('50 per minute');
	});

	it('formats per hour limits', () => {
		expect(formatLimit(500, 3600)).toBe('500 per hour');
		expect(formatLimit(100, 1800)).toBe('100 per 30 minutes');
	});

	it('formats per day limits', () => {
		expect(formatLimit(25, 86400)).toBe('25 per day');
		expect(formatLimit(100, 43200)).toBe('100 per 12 hours');
	});

	it('formats multi-day limits', () => {
		expect(formatLimit(10, 172800)).toBe('10 per 2 days');
		expect(formatLimit(5, 604800)).toBe('5 per 7 days');
	});
});
