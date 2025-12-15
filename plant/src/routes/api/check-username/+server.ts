/**
 * Username Availability Check API
 *
 * Returns availability status and suggestions if taken.
 * Checks: reserved_usernames, existing tenants, in-progress onboarding
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Username validation regex: starts with letter, lowercase alphanumeric and single hyphens
const USERNAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Reserved words that can't be usernames (in addition to database table)
const ADDITIONAL_RESERVED = [
	'admin',
	'api',
	'www',
	'mail',
	'grove',
	'plant',
	'create',
	'new',
	'support',
	'help'
];

interface CheckResult {
	available: boolean;
	username: string;
	error?: string;
	suggestions?: string[];
}

/**
 * Generate username suggestions when original is taken
 */
function generateSuggestions(base: string): string[] {
	const year = new Date().getFullYear();
	const suffixes = [
		`-writes`,
		`-blog`,
		`${year}`,
		`-place`,
		`-garden`,
		`-space`
	];

	return suffixes
		.map((suffix) => {
			const suggestion = base + suffix;
			// Ensure suggestion is valid
			if (USERNAME_REGEX.test(suggestion) && suggestion.length <= 30) {
				return suggestion;
			}
			return null;
		})
		.filter((s): s is string => s !== null)
		.slice(0, 3);
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const username = url.searchParams.get('username')?.toLowerCase().trim();

	if (!username) {
		return json({ available: false, username: '', error: 'Username is required' } as CheckResult);
	}

	// Basic validation
	if (username.length < 3) {
		return json({
			available: false,
			username,
			error: 'Username must be at least 3 characters'
		} as CheckResult);
	}

	if (username.length > 30) {
		return json({
			available: false,
			username,
			error: 'Username must be 30 characters or less'
		} as CheckResult);
	}

	if (!USERNAME_REGEX.test(username)) {
		return json({
			available: false,
			username,
			error: 'Username must start with a letter and contain only lowercase letters, numbers, and single hyphens'
		} as CheckResult);
	}

	// Check additional reserved words
	if (ADDITIONAL_RESERVED.includes(username)) {
		return json({
			available: false,
			username,
			error: 'This username is reserved',
			suggestions: generateSuggestions(username)
		} as CheckResult);
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({
			available: false,
			username,
			error: 'Service temporarily unavailable'
		} as CheckResult);
	}

	try {
		// Check reserved_usernames table
		const reserved = await db
			.prepare('SELECT username FROM reserved_usernames WHERE username = ?')
			.bind(username)
			.first();

		if (reserved) {
			return json({
				available: false,
				username,
				error: 'This username is reserved',
				suggestions: generateSuggestions(username)
			} as CheckResult);
		}

		// Check existing tenants
		const existingTenant = await db
			.prepare('SELECT subdomain FROM tenants WHERE subdomain = ?')
			.bind(username)
			.first();

		if (existingTenant) {
			return json({
				available: false,
				username,
				error: 'This username is already taken',
				suggestions: generateSuggestions(username)
			} as CheckResult);
		}

		// Check in-progress onboarding (someone else might be signing up with this username)
		const inProgress = await db
			.prepare(
				`SELECT username FROM user_onboarding
				 WHERE username = ? AND tenant_id IS NULL
				 AND created_at > unixepoch() - 3600` // Only check last hour
			)
			.bind(username)
			.first();

		if (inProgress) {
			return json({
				available: false,
				username,
				error: 'This username is currently being registered',
				suggestions: generateSuggestions(username)
			} as CheckResult);
		}

		// Username is available!
		return json({
			available: true,
			username
		} as CheckResult);
	} catch (error) {
		console.error('[Check Username] Error:', error);
		return json({
			available: false,
			username,
			error: 'Unable to check availability'
		} as CheckResult);
	}
};
