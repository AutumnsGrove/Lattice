import { describe, it, expect } from 'vitest';
import { getUserDisplayName, hasPersonalizedName } from './user';

describe('getUserDisplayName', () => {
	it('returns name when available', () => {
		expect(getUserDisplayName({ name: 'Jordan', email: 'jordan@example.com' })).toBe('Jordan');
	});

	it('returns email username when name is not set', () => {
		expect(getUserDisplayName({ email: 'wanderer@grove.place' })).toBe('wanderer');
	});

	it('returns email username when name is null', () => {
		expect(getUserDisplayName({ name: null, email: 'autumn@grove.place' })).toBe('autumn');
	});

	it('returns email username when name is empty string', () => {
		expect(getUserDisplayName({ name: '', email: 'reader@grove.place' })).toBe('reader');
	});

	it('returns "Wanderer" when user is undefined', () => {
		expect(getUserDisplayName(undefined)).toBe('Wanderer');
	});

	it('returns "Wanderer" when user is null', () => {
		expect(getUserDisplayName(null)).toBe('Wanderer');
	});

	it('returns "Wanderer" when both name and email are missing', () => {
		expect(getUserDisplayName({})).toBe('Wanderer');
	});

	it('returns "Wanderer" when both name and email are null', () => {
		expect(getUserDisplayName({ name: null, email: null })).toBe('Wanderer');
	});
});

describe('hasPersonalizedName', () => {
	it('returns true when name is set', () => {
		expect(hasPersonalizedName({ name: 'Jordan' })).toBe(true);
	});

	it('returns true when only email is set', () => {
		expect(hasPersonalizedName({ email: 'wanderer@grove.place' })).toBe(true);
	});

	it('returns false when user is undefined', () => {
		expect(hasPersonalizedName(undefined)).toBe(false);
	});

	it('returns false when user is null', () => {
		expect(hasPersonalizedName(null)).toBe(false);
	});

	it('returns false when both name and email are missing', () => {
		expect(hasPersonalizedName({})).toBe(false);
	});
});
