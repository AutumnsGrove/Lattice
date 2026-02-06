/**
 * Limits Module Tests
 *
 * Tests for post limit enforcement utilities covering:
 * - Quota status descriptions
 * - Urgency level calculation
 * - Suggested actions
 * - Upgrade recommendations
 * - Quota widget data
 * - Pre-submission checks
 */

import { describe, it, expect } from 'vitest';
import type { SubscriptionStatus, CanPostResponse } from './types';
import {
	getQuotaDescription,
	getQuotaUrgency,
	getSuggestedActions,
	getUpgradeRecommendation,
	getQuotaWidgetData,
	getPreSubmitCheck
} from './limits';

// ==========================================================================
// Test Helpers - Status Factory Functions
// ==========================================================================

function createStatus(overrides: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
	return {
		tier: 'seedling',
		post_count: 10,
		post_limit: 50,
		posts_remaining: 40,
		percentage_used: 20,
		is_at_limit: false,
		is_in_grace_period: false,
		grace_period_days_remaining: null,
		can_create_post: true,
		upgrade_required: false,
		...overrides
	};
}

function createAtLimitStatus(): SubscriptionStatus {
	return createStatus({
		post_count: 50,
		posts_remaining: 0,
		percentage_used: 100,
		is_at_limit: true
	});
}

function createGracePeriodStatus(daysRemaining: number): SubscriptionStatus {
	return createStatus({
		post_count: 55,
		posts_remaining: -5,
		percentage_used: 110,
		is_at_limit: true,
		is_in_grace_period: true,
		grace_period_days_remaining: daysRemaining
	});
}

function createUpgradeRequiredStatus(): SubscriptionStatus {
	return createStatus({
		post_count: 55,
		posts_remaining: -5,
		percentage_used: 110,
		is_at_limit: true,
		is_in_grace_period: false,
		grace_period_days_remaining: 0,
		can_create_post: false,
		upgrade_required: true
	});
}

function createUnlimitedStatus(): SubscriptionStatus {
	return createStatus({
		tier: 'oak',
		post_count: 500,
		post_limit: null,
		posts_remaining: null,
		percentage_used: null,
		is_at_limit: false
	});
}

// ==========================================================================
// getQuotaDescription
// ==========================================================================

describe('getQuotaDescription', () => {
	it('should return "Unlimited posts" for unlimited tier', () => {
		const status = createUnlimitedStatus();
		expect(getQuotaDescription(status)).toBe('Unlimited posts');
	});

	it('should show used/limit for normal usage', () => {
		const status = createStatus({ post_count: 10, post_limit: 50 });
		expect(getQuotaDescription(status)).toBe('10/50 posts used');
	});

	it('should show remaining with percentage for high usage (90%+)', () => {
		const status = createStatus({
			post_count: 45,
			post_limit: 50,
			posts_remaining: 5,
			percentage_used: 90
		});
		expect(getQuotaDescription(status)).toContain('5 posts remaining');
		expect(getQuotaDescription(status)).toContain('90%');
	});

	it('should show at limit message when at limit', () => {
		const status = createAtLimitStatus();
		expect(getQuotaDescription(status)).toContain('At limit');
		expect(getQuotaDescription(status)).toContain('50/50');
	});

	it('should show grace period message when in grace period', () => {
		const status = createGracePeriodStatus(10);
		expect(getQuotaDescription(status)).toContain('Limit reached');
		expect(getQuotaDescription(status)).toContain('10 days remaining');
	});

	it('should show upgrade required message', () => {
		const status = createUpgradeRequiredStatus();
		expect(getQuotaDescription(status)).toContain('Limit reached');
		expect(getQuotaDescription(status)).toContain('Upgrade required');
	});
});

// ==========================================================================
// getQuotaUrgency
// ==========================================================================

describe('getQuotaUrgency', () => {
	it('should return "healthy" for low usage', () => {
		const status = createStatus({ percentage_used: 50 });
		expect(getQuotaUrgency(status)).toBe('healthy');
	});

	it('should return "warning" for 90%+ usage', () => {
		const status = createStatus({ percentage_used: 90 });
		expect(getQuotaUrgency(status)).toBe('warning');
	});

	it('should return "critical" when at 100%', () => {
		const status = createStatus({ percentage_used: 100 });
		expect(getQuotaUrgency(status)).toBe('critical');
	});

	it('should return "critical" when is_at_limit is true', () => {
		const status = createAtLimitStatus();
		expect(getQuotaUrgency(status)).toBe('critical');
	});

	it('should return "blocked" when upgrade required', () => {
		const status = createUpgradeRequiredStatus();
		expect(getQuotaUrgency(status)).toBe('blocked');
	});

	it('should return "healthy" for unlimited tiers', () => {
		const status = createUnlimitedStatus();
		expect(getQuotaUrgency(status)).toBe('healthy');
	});
});

// ==========================================================================
// getSuggestedActions
// ==========================================================================

describe('getSuggestedActions', () => {
	it('should return empty array for healthy usage', () => {
		const status = createStatus({ percentage_used: 50 });
		expect(getSuggestedActions(status)).toEqual([]);
	});

	it('should suggest upgrade when at 75-89% usage', () => {
		const status = createStatus({ percentage_used: 80 });
		const actions = getSuggestedActions(status);
		expect(actions.some((a) => a.includes('Consider upgrading'))).toBe(true);
	});

	it('should suggest upgrade and delete when at limit', () => {
		const status = createAtLimitStatus();
		const actions = getSuggestedActions(status);
		expect(actions.some((a) => a.includes('Upgrade'))).toBe(true);
		expect(actions.some((a) => a.includes('Delete'))).toBe(true);
	});

	it('should warn about grace period with days remaining', () => {
		const status = createGracePeriodStatus(7);
		const actions = getSuggestedActions(status);
		expect(actions.some((a) => a.includes('7 days'))).toBe(true);
	});

	it('should prioritize upgrade message when upgrade required', () => {
		const status = createUpgradeRequiredStatus();
		const actions = getSuggestedActions(status);
		expect(actions[0]).toContain('Upgrade');
		expect(actions.length).toBe(2);
	});
});

// ==========================================================================
// getUpgradeRecommendation
// ==========================================================================

describe('getUpgradeRecommendation', () => {
	it('should not recommend upgrade for evergreen tier', () => {
		const status = createStatus({ tier: 'evergreen', post_limit: null });
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(false);
		expect(rec.toTier).toBeNull();
		expect(rec.reason).toContain('highest tier');
	});

	it('should not recommend upgrade for oak tier', () => {
		const status = createStatus({ tier: 'oak', post_limit: null });
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(false);
		expect(rec.reason).toContain('unlimited posts');
	});

	it('should recommend Sapling for seedling at limit', () => {
		const status = createAtLimitStatus();
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(true);
		expect(rec.fromTier).toBe('Seedling');
		expect(rec.toTier).toBe('Sapling');
	});

	it('should recommend Oak for sapling at limit', () => {
		const status = createStatus({
			tier: 'sapling',
			post_count: 250,
			post_limit: 250,
			is_at_limit: true
		});
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(true);
		expect(rec.toTier).toBe('Oak');
	});

	it('should recommend upgrade when at 80%+ usage', () => {
		const status = createStatus({ percentage_used: 85 });
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(true);
		expect(rec.reason).toContain('85%');
	});

	it('should not recommend upgrade for normal usage', () => {
		const status = createStatus({ percentage_used: 50 });
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(false);
		expect(rec.reason).toContain('sufficient');
	});

	it('should recommend upgrade when upgrade_required is true', () => {
		const status = createUpgradeRequiredStatus();
		const rec = getUpgradeRecommendation(status);
		expect(rec.recommended).toBe(true);
		expect(rec.reason).toContain('limit');
	});
});

// ==========================================================================
// getQuotaWidgetData
// ==========================================================================

describe('getQuotaWidgetData', () => {
	it('should return correct counts', () => {
		const status = createStatus({ post_count: 25, post_limit: 50 });
		const data = getQuotaWidgetData(status);
		expect(data.count).toBe(25);
		expect(data.limit).toBe(50);
	});

	it('should return green color for healthy status', () => {
		const status = createStatus({ percentage_used: 50 });
		const data = getQuotaWidgetData(status);
		expect(data.color).toBe('green');
		expect(data.statusText).toBe('Healthy');
	});

	it('should return yellow color for warning status', () => {
		const status = createStatus({ percentage_used: 92 });
		const data = getQuotaWidgetData(status);
		expect(data.color).toBe('yellow');
		expect(data.statusText).toBe('Warning');
	});

	it('should return red color for critical status', () => {
		const status = createAtLimitStatus();
		const data = getQuotaWidgetData(status);
		expect(data.color).toBe('red');
		expect(data.statusText).toBe('Critical');
	});

	it('should return red color for blocked status', () => {
		const status = createUpgradeRequiredStatus();
		const data = getQuotaWidgetData(status);
		expect(data.color).toBe('red');
		expect(data.statusText).toBe('Blocked');
	});

	it('should return gray color for unlimited tier', () => {
		const status = createUnlimitedStatus();
		const data = getQuotaWidgetData(status);
		expect(data.color).toBe('gray');
		expect(data.statusText).toBe('Unlimited');
	});

	it('should set showUpgrade for warning/critical/blocked', () => {
		expect(getQuotaWidgetData(createStatus({ percentage_used: 50 })).showUpgrade).toBe(false);
		expect(getQuotaWidgetData(createStatus({ percentage_used: 92 })).showUpgrade).toBe(true);
		expect(getQuotaWidgetData(createAtLimitStatus()).showUpgrade).toBe(true);
		expect(getQuotaWidgetData(createUpgradeRequiredStatus()).showUpgrade).toBe(true);
	});

	it('should include tier name', () => {
		const data = getQuotaWidgetData(createStatus({ tier: 'sapling' }));
		expect(data.tierName).toBe('Sapling');
	});

	it('should reflect canPost status', () => {
		expect(getQuotaWidgetData(createStatus({ can_create_post: true })).canPost).toBe(true);
		expect(getQuotaWidgetData(createStatus({ can_create_post: false })).canPost).toBe(false);
	});

	it('should include null values for unlimited tiers', () => {
		const data = getQuotaWidgetData(createUnlimitedStatus());
		expect(data.limit).toBeNull();
		expect(data.percentage).toBeNull();
		expect(data.remaining).toBeNull();
	});
});

// ==========================================================================
// getPreSubmitCheck
// ==========================================================================

describe('getPreSubmitCheck', () => {
	function createCanPostResponse(
		allowed: boolean,
		status: SubscriptionStatus
	): CanPostResponse {
		return {
			allowed,
			status,
			subscription: {
				id: 'sub-1',
				user_id: 'user-1',
				tier: status.tier,
				post_limit: status.post_limit,
				post_count: status.post_count,
				grace_period_start: null,
				grace_period_days: 14,
				stripe_customer_id: null,
				stripe_subscription_id: null,
				billing_period_start: null,
				billing_period_end: null,
				custom_domain: null,
				custom_domain_verified: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		};
	}

	it('should allow posting for healthy status', () => {
		const response = createCanPostResponse(true, createStatus({ percentage_used: 50 }));
		const check = getPreSubmitCheck(response);

		expect(check.allowed).toBe(true);
		expect(check.showWarning).toBe(false);
		expect(check.warningMessage).toBeNull();
		expect(check.upgradeRequired).toBe(false);
	});

	it('should show warning at 90%+ usage', () => {
		const status = createStatus({ percentage_used: 95 });
		const response = createCanPostResponse(true, status);
		const check = getPreSubmitCheck(response);

		expect(check.allowed).toBe(true);
		expect(check.showWarning).toBe(true);
		expect(check.warningMessage).toContain('95%');
	});

	it('should warn about grace period start when at limit', () => {
		const status = createAtLimitStatus();
		const response = createCanPostResponse(true, status);
		const check = getPreSubmitCheck(response);

		expect(check.showWarning).toBe(true);
		expect(check.warningMessage).toContain('grace period');
	});

	it('should warn during grace period with days remaining', () => {
		const status = createGracePeriodStatus(7);
		const response = createCanPostResponse(true, status);
		const check = getPreSubmitCheck(response);

		expect(check.allowed).toBe(true);
		expect(check.showWarning).toBe(true);
		expect(check.warningMessage).toContain('7 days remaining');
	});

	it('should block and show upgrade required when expired', () => {
		const status = createUpgradeRequiredStatus();
		const response = createCanPostResponse(false, status);
		const check = getPreSubmitCheck(response);

		expect(check.allowed).toBe(false);
		expect(check.showWarning).toBe(true);
		expect(check.upgradeRequired).toBe(true);
		expect(check.warningMessage).toContain('grace period has expired');
	});

	it('should include full status in response', () => {
		const status = createStatus();
		const response = createCanPostResponse(true, status);
		const check = getPreSubmitCheck(response);

		expect(check.status).toBe(status);
	});
});
