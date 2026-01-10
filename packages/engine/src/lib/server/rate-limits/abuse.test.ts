/**
 * Tests for Abuse Tracking & Graduated Response System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getAbuseState,
	recordViolation,
	isBanned,
	getBanRemaining,
	clearAbuseState,
	type AbuseState
} from './abuse.js';
import { createMockKV } from './test-utils.js';

describe('getAbuseState', () => {
	let mockKV: KVNamespace;

	beforeEach(() => {
		mockKV = createMockKV();
	});

	it('returns fresh state for new users', async () => {
		const state = await getAbuseState(mockKV, 'new-user');
		expect(state.violations).toBe(0);
		expect(state.lastViolation).toBe(0);
		expect(state.bannedUntil).toBeNull();
	});

	it('returns stored state within decay window', async () => {
		const now = Math.floor(Date.now() / 1000);
		const storedState: AbuseState = {
			violations: 3,
			lastViolation: now - 3600, // 1 hour ago
			bannedUntil: null
		};
		await mockKV.put('abuse:user123', JSON.stringify(storedState));

		const state = await getAbuseState(mockKV, 'user123');
		expect(state.violations).toBe(3);
		expect(state.lastViolation).toBe(storedState.lastViolation);
	});

	it('resets state after decay period (24h)', async () => {
		const now = Math.floor(Date.now() / 1000);
		const storedState: AbuseState = {
			violations: 4,
			lastViolation: now - 90000, // More than 24h ago
			bannedUntil: null
		};
		await mockKV.put('abuse:user123', JSON.stringify(storedState));

		const state = await getAbuseState(mockKV, 'user123');
		expect(state.violations).toBe(0);
		expect(state.lastViolation).toBe(0);
		expect(state.bannedUntil).toBeNull();
	});

	it('handles KV errors gracefully', async () => {
		(mockKV.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('KV error'));

		const state = await getAbuseState(mockKV, 'user123');
		expect(state.violations).toBe(0);
		expect(state.bannedUntil).toBeNull();
	});
});

describe('recordViolation', () => {
	let mockKV: KVNamespace;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockKV = createMockKV();
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('increments violation count', async () => {
		const result1 = await recordViolation(mockKV, 'user123');
		expect(result1.warning).toBe(true);
		expect(result1.banned).toBe(false);

		const state = await getAbuseState(mockKV, 'user123');
		expect(state.violations).toBe(1);
	});

	it('returns warning for violations 1-4', async () => {
		for (let i = 1; i <= 4; i++) {
			const result = await recordViolation(mockKV, 'warning-user');
			expect(result.warning).toBe(true);
			expect(result.banned).toBe(false);
			expect(result.bannedUntil).toBeNull();
		}
	});

	it('returns banned for violation 5+', async () => {
		// Record 4 violations first
		for (let i = 0; i < 4; i++) {
			await recordViolation(mockKV, 'ban-user');
		}

		// 5th violation should trigger ban
		const result = await recordViolation(mockKV, 'ban-user');
		expect(result.warning).toBe(false);
		expect(result.banned).toBe(true);
		expect(result.bannedUntil).toBeTypeOf('number');
	});

	it('sets bannedUntil to 24h from now', async () => {
		const now = Math.floor(Date.now() / 1000);

		// Record 5 violations to trigger ban
		for (let i = 0; i < 5; i++) {
			await recordViolation(mockKV, 'ban-time-user');
		}

		const state = await getAbuseState(mockKV, 'ban-time-user');
		const expectedBanEnd = now + 86400;

		// Allow 5 second tolerance for test execution time
		expect(state.bannedUntil).toBeGreaterThanOrEqual(expectedBanEnd - 5);
		expect(state.bannedUntil).toBeLessThanOrEqual(expectedBanEnd + 5);
	});

	it('logs violation events', async () => {
		await recordViolation(mockKV, 'log-user');

		expect(consoleSpy).toHaveBeenCalled();
		const logCall = consoleSpy.mock.calls[0][0];
		const logData = JSON.parse(logCall);
		expect(logData.event).toBe('rate_limit_violation');
		expect(logData.userId).toBe('log-user');
		expect(logData.violations).toBe(1);
	});
});

describe('isBanned', () => {
	it('returns false when bannedUntil is null', () => {
		const state: AbuseState = {
			violations: 3,
			lastViolation: Math.floor(Date.now() / 1000),
			bannedUntil: null
		};
		expect(isBanned(state)).toBe(false);
	});

	it('returns false when ban has expired', () => {
		const now = Math.floor(Date.now() / 1000);
		const state: AbuseState = {
			violations: 5,
			lastViolation: now - 90000,
			bannedUntil: now - 3600 // Ban expired 1 hour ago
		};
		expect(isBanned(state)).toBe(false);
	});

	it('returns true when ban is active', () => {
		const now = Math.floor(Date.now() / 1000);
		const state: AbuseState = {
			violations: 5,
			lastViolation: now - 3600,
			bannedUntil: now + 3600 // Ban ends in 1 hour
		};
		expect(isBanned(state)).toBe(true);
	});
});

describe('getBanRemaining', () => {
	it('returns 0 when not banned', () => {
		const state: AbuseState = {
			violations: 2,
			lastViolation: Math.floor(Date.now() / 1000),
			bannedUntil: null
		};
		expect(getBanRemaining(state)).toBe(0);
	});

	it('returns 0 when ban has expired', () => {
		const now = Math.floor(Date.now() / 1000);
		const state: AbuseState = {
			violations: 5,
			lastViolation: now - 90000,
			bannedUntil: now - 100
		};
		expect(getBanRemaining(state)).toBe(0);
	});

	it('returns remaining time when ban is active', () => {
		const now = Math.floor(Date.now() / 1000);
		const state: AbuseState = {
			violations: 5,
			lastViolation: now - 3600,
			bannedUntil: now + 3600
		};

		const remaining = getBanRemaining(state);
		// Allow 5 second tolerance
		expect(remaining).toBeGreaterThan(3595);
		expect(remaining).toBeLessThanOrEqual(3600);
	});
});

describe('clearAbuseState', () => {
	let mockKV: KVNamespace;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockKV = createMockKV();
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it('clears abuse state for user', async () => {
		// Record a violation first
		await recordViolation(mockKV, 'clear-user');

		// Verify state exists
		let state = await getAbuseState(mockKV, 'clear-user');
		expect(state.violations).toBe(1);

		// Clear state
		await clearAbuseState(mockKV, 'clear-user');

		// Verify state is cleared
		state = await getAbuseState(mockKV, 'clear-user');
		expect(state.violations).toBe(0);
	});

	it('logs clear event', async () => {
		await clearAbuseState(mockKV, 'log-clear-user');

		const logCalls = consoleSpy.mock.calls.filter((call) => {
			try {
				const data = JSON.parse(call[0]);
				return data.event === 'abuse_state_cleared';
			} catch {
				return false;
			}
		});

		expect(logCalls.length).toBe(1);
	});
});
