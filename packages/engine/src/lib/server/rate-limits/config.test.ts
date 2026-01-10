/**
 * Tests for Threshold Rate Limit Configuration
 */

import { describe, it, expect } from 'vitest';
import {
	TIER_RATE_LIMITS,
	ENDPOINT_RATE_LIMITS,
	ENDPOINT_MAP,
	getEndpointLimit,
	getTierLimit,
	isValidTier,
	type SubscriptionTier,
	type RateLimitCategory
} from './config.js';

describe('TIER_RATE_LIMITS', () => {
	const tiers: SubscriptionTier[] = ['seedling', 'sapling', 'oak', 'evergreen'];
	const categories: RateLimitCategory[] = ['requests', 'writes', 'uploads', 'ai'];

	it('all tiers have all categories', () => {
		for (const tier of tiers) {
			for (const category of categories) {
				expect(TIER_RATE_LIMITS[tier][category]).toBeDefined();
			}
		}
	});

	it('all categories have limit and windowSeconds', () => {
		for (const tier of tiers) {
			for (const category of categories) {
				const config = TIER_RATE_LIMITS[tier][category];
				expect(config.limit).toBeTypeOf('number');
				expect(config.windowSeconds).toBeTypeOf('number');
				expect(config.limit).toBeGreaterThan(0);
				expect(config.windowSeconds).toBeGreaterThan(0);
			}
		}
	});

	it('higher tiers have higher or equal limits', () => {
		for (const category of categories) {
			expect(TIER_RATE_LIMITS.sapling[category].limit).toBeGreaterThanOrEqual(
				TIER_RATE_LIMITS.seedling[category].limit
			);
			expect(TIER_RATE_LIMITS.oak[category].limit).toBeGreaterThanOrEqual(
				TIER_RATE_LIMITS.sapling[category].limit
			);
			expect(TIER_RATE_LIMITS.evergreen[category].limit).toBeGreaterThanOrEqual(
				TIER_RATE_LIMITS.oak[category].limit
			);
		}
	});

	it('seedling has expected default values', () => {
		expect(TIER_RATE_LIMITS.seedling.requests.limit).toBe(100);
		expect(TIER_RATE_LIMITS.seedling.requests.windowSeconds).toBe(60);
		expect(TIER_RATE_LIMITS.seedling.ai.limit).toBe(25);
		expect(TIER_RATE_LIMITS.seedling.ai.windowSeconds).toBe(86400);
	});
});

describe('ENDPOINT_RATE_LIMITS', () => {
	it('has default fallback', () => {
		expect(ENDPOINT_RATE_LIMITS.default).toBeDefined();
		expect(ENDPOINT_RATE_LIMITS.default.limit).toBeGreaterThan(0);
		expect(ENDPOINT_RATE_LIMITS.default.windowSeconds).toBeGreaterThan(0);
	});

	it('auth endpoints have stricter limits than default', () => {
		expect(ENDPOINT_RATE_LIMITS['auth/login'].limit).toBeLessThan(
			ENDPOINT_RATE_LIMITS.default.limit
		);
		expect(ENDPOINT_RATE_LIMITS['auth/token'].limit).toBeLessThan(
			ENDPOINT_RATE_LIMITS.default.limit
		);
	});

	it('AI endpoints have daily windows', () => {
		expect(ENDPOINT_RATE_LIMITS['ai/wisp'].windowSeconds).toBe(86400);
		expect(ENDPOINT_RATE_LIMITS['ai/fireside'].windowSeconds).toBe(86400);
	});
});

describe('getEndpointLimit', () => {
	it('returns correct limit for known endpoints', () => {
		const loginLimit = getEndpointLimit('POST', '/api/auth/login');
		expect(loginLimit.limit).toBe(5);
		expect(loginLimit.windowSeconds).toBe(300);

		const wispLimit = getEndpointLimit('POST', '/api/grove/wisp');
		expect(wispLimit.limit).toBe(50);
		expect(wispLimit.windowSeconds).toBe(86400);
	});

	it('returns default for unknown endpoints', () => {
		const unknownLimit = getEndpointLimit('GET', '/api/unknown/endpoint');
		expect(unknownLimit.limit).toBe(ENDPOINT_RATE_LIMITS.default.limit);
		expect(unknownLimit.windowSeconds).toBe(ENDPOINT_RATE_LIMITS.default.windowSeconds);
	});

	it('returns default for unmatched method', () => {
		// GET /api/auth/login is not mapped, only POST
		const getLoginLimit = getEndpointLimit('GET', '/api/auth/login');
		expect(getLoginLimit.limit).toBe(ENDPOINT_RATE_LIMITS.default.limit);
	});
});

describe('getTierLimit', () => {
	it('returns correct limit for tier and category', () => {
		const seedlingRequests = getTierLimit('seedling', 'requests');
		expect(seedlingRequests.limit).toBe(100);
		expect(seedlingRequests.windowSeconds).toBe(60);

		const oakAi = getTierLimit('oak', 'ai');
		expect(oakAi.limit).toBe(500);
		expect(oakAi.windowSeconds).toBe(86400);
	});
});

describe('isValidTier', () => {
	it('returns true for valid tiers', () => {
		expect(isValidTier('seedling')).toBe(true);
		expect(isValidTier('sapling')).toBe(true);
		expect(isValidTier('oak')).toBe(true);
		expect(isValidTier('evergreen')).toBe(true);
	});

	it('returns false for invalid tiers', () => {
		expect(isValidTier('invalid')).toBe(false);
		expect(isValidTier('')).toBe(false);
		expect(isValidTier('SEEDLING')).toBe(false);
	});
});

describe('ENDPOINT_MAP', () => {
	it('maps auth endpoints correctly', () => {
		expect(ENDPOINT_MAP['POST:/api/auth/login']).toBe('auth/login');
		expect(ENDPOINT_MAP['POST:/api/auth/token']).toBe('auth/token');
	});

	it('maps AI endpoints correctly', () => {
		expect(ENDPOINT_MAP['POST:/api/grove/wisp']).toBe('ai/wisp');
		expect(ENDPOINT_MAP['POST:/api/ai/wisp']).toBe('ai/wisp');
	});
});
