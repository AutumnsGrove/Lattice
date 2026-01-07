/**
 * Username Availability Check API
 *
 * Returns availability status and suggestions if taken.
 * Checks: blocklist, reserved_usernames, existing tenants, in-progress onboarding
 *
 * @see docs/specs/domain-blocklist-policy.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isUsernameBlocked,
	getBlockedMessage,
	VALIDATION_CONFIG,
	type BlocklistReason
} from '@autumnsgrove/groveengine/config/domain-blocklist';
import { containsOffensiveContent } from '@autumnsgrove/groveengine/config/offensive-blocklist';

interface CheckResult {
	available: boolean;
	username: string;
	error?: string;
	suggestions?: string[];
}

/**
 * Generate username suggestions when original is taken
 */
function generateSuggestions(base: string, reason: BlocklistReason | null): string[] {
	// Don't suggest alternatives for offensive terms
	if (reason === 'offensive') {
		return [];
	}

	const year = new Date().getFullYear();
	const suffixes = ['-writes', '-blog', `${year}`, '-place', '-garden', '-space'];

	return suffixes
		.map((suffix) => {
			const suggestion = base + suffix;
			// Ensure suggestion is valid and not also blocked
			if (
				VALIDATION_CONFIG.pattern.test(suggestion) &&
				suggestion.length <= VALIDATION_CONFIG.maxLength &&
				!isUsernameBlocked(suggestion) &&
				!containsOffensiveContent(suggestion)
			) {
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

	// Length validation
	if (username.length < VALIDATION_CONFIG.minLength) {
		return json({
			available: false,
			username,
			error: `Username must be at least ${VALIDATION_CONFIG.minLength} characters`
		} as CheckResult);
	}

	if (username.length > VALIDATION_CONFIG.maxLength) {
		return json({
			available: false,
			username,
			error: `Username must be ${VALIDATION_CONFIG.maxLength} characters or less`
		} as CheckResult);
	}

	// Pattern validation
	if (!VALIDATION_CONFIG.pattern.test(username)) {
		return json({
			available: false,
			username,
			error: VALIDATION_CONFIG.patternDescription
		} as CheckResult);
	}

	// Check offensive content first (no suggestions, generic error)
	if (containsOffensiveContent(username)) {
		return json({
			available: false,
			username,
			error: 'This username is not available'
			// Intentionally no suggestions for offensive terms
		} as CheckResult);
	}

	// Check blocklist (reserved/trademarked/system names)
	const blockedReason = isUsernameBlocked(username);
	if (blockedReason) {
		return json({
			available: false,
			username,
			error: getBlockedMessage(blockedReason),
			suggestions: generateSuggestions(username, blockedReason)
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
		// Check reserved_usernames table (for any additional entries)
		const reserved = await db
			.prepare('SELECT username, reason FROM reserved_usernames WHERE username = ?')
			.bind(username)
			.first<{ username: string; reason: string }>();

		if (reserved) {
			// Map database reason to blocklist reason type
			const reason = (reserved.reason || 'system') as BlocklistReason;
			return json({
				available: false,
				username,
				error: getBlockedMessage(reason),
				suggestions: generateSuggestions(username, reason)
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
				suggestions: generateSuggestions(username, null)
			} as CheckResult);
		}

		// Check in-progress onboarding (someone else might be signing up with this username)
		const inProgress = await db
			.prepare(
				`SELECT username FROM user_onboarding
				 WHERE username = ? AND tenant_id IS NULL
				 AND created_at > unixepoch() - 3600`
			)
			.bind(username)
			.first();

		if (inProgress) {
			return json({
				available: false,
				username,
				error: 'This username is currently being registered',
				suggestions: generateSuggestions(username, null)
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
