/**
 * Username Availability Check API
 *
 * Returns availability status and suggestions if taken.
 * Checks: blocklist, reserved_usernames, existing tenants, in-progress onboarding
 *
 * Rate limited to prevent blocklist enumeration attacks.
 *
 * @see docs/specs/loam-spec.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isUsernameBlocked,
	getBlockedMessage,
	VALIDATION_CONFIG,
	type BlocklistReason,
	VALID_BLOCKLIST_REASONS
} from '@autumnsgrove/groveengine/config/domain-blocklist';
import { containsOffensiveContent } from '@autumnsgrove/groveengine/config/offensive-blocklist';

/** Time window (in seconds) for in-progress registration checks */
const IN_PROGRESS_WINDOW_SECONDS = 3600; // 1 hour

/** Rate limit configuration */
const RATE_LIMIT = {
	maxRequests: 30, // Max requests per window
	windowSeconds: 60 // 1 minute window
};

interface CheckResult {
	available: boolean;
	username: string;
	error?: string;
	suggestions?: string[];
}

/**
 * Simple KV-based rate limiter
 * Returns true if request should be allowed, false if rate limited
 */
async function checkRateLimit(
	kv: KVNamespace | undefined,
	clientIp: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	if (!kv) {
		// No KV available, allow the request (development mode)
		return { allowed: true, remaining: RATE_LIMIT.maxRequests, resetAt: 0 };
	}

	const key = `rate:username-check:${clientIp}`;
	const now = Math.floor(Date.now() / 1000);

	try {
		const data = await kv.get(key, 'json') as { count: number; resetAt: number } | null;

		if (!data || now >= data.resetAt) {
			// New window
			const newData = { count: 1, resetAt: now + RATE_LIMIT.windowSeconds };
			await kv.put(key, JSON.stringify(newData), { expirationTtl: RATE_LIMIT.windowSeconds + 60 });
			return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetAt: newData.resetAt };
		}

		if (data.count >= RATE_LIMIT.maxRequests) {
			// Rate limited
			return { allowed: false, remaining: 0, resetAt: data.resetAt };
		}

		// Increment counter
		const newData = { count: data.count + 1, resetAt: data.resetAt };
		await kv.put(key, JSON.stringify(newData), { expirationTtl: data.resetAt - now + 60 });
		return { allowed: true, remaining: RATE_LIMIT.maxRequests - newData.count, resetAt: data.resetAt };
	} catch {
		// On error, allow the request
		return { allowed: true, remaining: RATE_LIMIT.maxRequests, resetAt: 0 };
	}
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

export const GET: RequestHandler = async ({ url, platform, getClientAddress }) => {
	// Rate limiting check
	const clientIp = getClientAddress();
	const kv = platform?.env?.KV as KVNamespace | undefined;
	const rateLimit = await checkRateLimit(kv, clientIp);

	if (!rateLimit.allowed) {
		const retryAfter = rateLimit.resetAt - Math.floor(Date.now() / 1000);
		return json(
			{ available: false, username: '', error: 'Too many requests. Please try again shortly.' } as CheckResult,
			{
				status: 429,
				headers: {
					'Retry-After': String(retryAfter),
					'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': String(rateLimit.resetAt)
				}
			}
		);
	}

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
			// Validate that database reason is a valid BlocklistReason, fallback to 'system'
			const reason: BlocklistReason = VALID_BLOCKLIST_REASONS.includes(
				reserved.reason as BlocklistReason
			)
				? (reserved.reason as BlocklistReason)
				: 'system';
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
				 AND created_at > unixepoch() - ?`
			)
			.bind(username, IN_PROGRESS_WINDOW_SECONDS)
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
