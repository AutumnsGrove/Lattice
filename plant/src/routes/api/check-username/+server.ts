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
	windowSeconds: 60, // 1 minute window
	kvBufferSeconds: 60 // Extra TTL buffer to prevent edge cases
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
		const data = (await kv.get(key, 'json')) as { count: number; resetAt: number } | null;

		if (!data || now >= data.resetAt) {
			// New window
			const newData = { count: 1, resetAt: now + RATE_LIMIT.windowSeconds };
			await kv.put(key, JSON.stringify(newData), {
				expirationTtl: RATE_LIMIT.windowSeconds + RATE_LIMIT.kvBufferSeconds
			});
			return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetAt: newData.resetAt };
		}

		if (data.count >= RATE_LIMIT.maxRequests) {
			// Rate limited
			return { allowed: false, remaining: 0, resetAt: data.resetAt };
		}

		// Increment counter
		const newData = { count: data.count + 1, resetAt: data.resetAt };
		await kv.put(key, JSON.stringify(newData), {
			expirationTtl: data.resetAt - now + RATE_LIMIT.kvBufferSeconds
		});
		return { allowed: true, remaining: RATE_LIMIT.maxRequests - newData.count, resetAt: data.resetAt };
	} catch (error) {
		// Log error but allow the request to prevent blocking users on KV failures
		console.error('[Rate Limit] KV error:', error);
		return { allowed: true, remaining: RATE_LIMIT.maxRequests, resetAt: 0 };
	}
}

/**
 * Generate rate limit headers for responses
 */
function getRateLimitHeaders(rateLimit: { remaining: number; resetAt: number }): Record<string, string> {
	return {
		'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
		'X-RateLimit-Remaining': String(rateLimit.remaining),
		'X-RateLimit-Reset': String(rateLimit.resetAt)
	};
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
	const rateLimitHeaders = getRateLimitHeaders(rateLimit);

	// Helper to return JSON with rate limit headers
	const respond = (data: CheckResult, status = 200, extraHeaders: Record<string, string> = {}) =>
		json(data, { status, headers: { ...rateLimitHeaders, ...extraHeaders } });

	if (!rateLimit.allowed) {
		const retryAfter = rateLimit.resetAt - Math.floor(Date.now() / 1000);
		return respond(
			{ available: false, username: '', error: 'Too many requests. Please try again shortly.' },
			429,
			{ 'Retry-After': String(retryAfter) }
		);
	}

	const username = url.searchParams.get('username')?.toLowerCase().trim();

	if (!username) {
		return respond({ available: false, username: '', error: 'Username is required' });
	}

	// Length validation
	if (username.length < VALIDATION_CONFIG.minLength) {
		return respond({
			available: false,
			username,
			error: `Username must be at least ${VALIDATION_CONFIG.minLength} characters`
		});
	}

	if (username.length > VALIDATION_CONFIG.maxLength) {
		return respond({
			available: false,
			username,
			error: `Username must be ${VALIDATION_CONFIG.maxLength} characters or less`
		});
	}

	// Pattern validation
	if (!VALIDATION_CONFIG.pattern.test(username)) {
		return respond({
			available: false,
			username,
			error: VALIDATION_CONFIG.patternDescription
		});
	}

	// Check offensive content first (no suggestions, generic error)
	if (containsOffensiveContent(username)) {
		return respond({
			available: false,
			username,
			error: 'This username is not available'
			// Intentionally no suggestions for offensive terms
		});
	}

	// Check blocklist (reserved/trademarked/system names)
	const blockedReason = isUsernameBlocked(username);
	if (blockedReason) {
		return respond({
			available: false,
			username,
			error: getBlockedMessage(blockedReason),
			suggestions: generateSuggestions(username, blockedReason)
		});
	}

	const db = platform?.env?.DB;
	if (!db) {
		return respond({
			available: false,
			username,
			error: 'Service temporarily unavailable'
		});
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
			return respond({
				available: false,
				username,
				error: getBlockedMessage(reason),
				suggestions: generateSuggestions(username, reason)
			});
		}

		// Check existing tenants
		const existingTenant = await db
			.prepare('SELECT subdomain FROM tenants WHERE subdomain = ?')
			.bind(username)
			.first();

		if (existingTenant) {
			return respond({
				available: false,
				username,
				error: 'This username is already taken',
				suggestions: generateSuggestions(username, null)
			});
		}

		// Check in-progress onboarding (someone else might be signing up with this username)
		// Use calculated timestamp for consistency across database engines
		const cutoffTimestamp = Math.floor(Date.now() / 1000) - IN_PROGRESS_WINDOW_SECONDS;
		const inProgress = await db
			.prepare(
				`SELECT username FROM user_onboarding
				 WHERE username = ? AND tenant_id IS NULL
				 AND created_at > ?`
			)
			.bind(username, cutoffTimestamp)
			.first();

		if (inProgress) {
			return respond({
				available: false,
				username,
				error: 'This username is currently being registered',
				suggestions: generateSuggestions(username, null)
			});
		}

		// Username is available!
		return respond({
			available: true,
			username
		});
	} catch (error) {
		console.error('[Check Username] Error:', error);
		return respond({
			available: false,
			username,
			error: 'Unable to check availability'
		});
	}
};
