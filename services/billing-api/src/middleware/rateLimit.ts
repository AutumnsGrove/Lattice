/**
 * Rate Limiting Middleware
 *
 * KV-backed rate limiting keyed by tenantId (or IP for webhook).
 * Uses a sliding-window counter pattern stored in CACHE_KV.
 */

import type { MiddlewareHandler } from "hono";
import type { Env } from "../types.js";
import { BILLING_ERRORS, billingError } from "../errors.js";

// =============================================================================
// RATE LIMIT CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
	/** Maximum requests allowed in the window */
	limit: number;
	/** Window duration in seconds */
	windowSeconds: number;
	/** Key prefix for KV storage */
	keyPrefix: string;
}

/** Per-endpoint rate limits (from spec) */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
	checkout: { limit: 10, windowSeconds: 3600, keyPrefix: "rl:checkout" },
	portal: { limit: 20, windowSeconds: 3600, keyPrefix: "rl:portal" },
	cancel: { limit: 5, windowSeconds: 3600, keyPrefix: "rl:cancel" },
	resume: { limit: 5, windowSeconds: 3600, keyPrefix: "rl:resume" },
	status: { limit: 100, windowSeconds: 3600, keyPrefix: "rl:status" },
	webhook: { limit: 1000, windowSeconds: 3600, keyPrefix: "rl:webhook" },
};

// =============================================================================
// RATE LIMIT CHECK
// =============================================================================

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

/**
 * Check rate limit against KV.
 * Fails open (allows request) if KV is unavailable.
 */
async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	config: RateLimitConfig,
): Promise<RateLimitResult> {
	const now = Math.floor(Date.now() / 1000);
	const windowStart = now - (now % config.windowSeconds);
	const kvKey = `${config.keyPrefix}:${key}:${windowStart}`;
	const resetAt = windowStart + config.windowSeconds;

	try {
		const current = await kv.get(kvKey);
		const count = current ? parseInt(current, 10) : 0;

		if (count >= config.limit) {
			return { allowed: false, remaining: 0, resetAt };
		}

		// Increment counter
		await kv.put(kvKey, String(count + 1), {
			expirationTtl: config.windowSeconds + 60, // Extra 60s buffer
		});

		return {
			allowed: true,
			remaining: config.limit - count - 1,
			resetAt,
		};
	} catch (error) {
		// Fail open — don't block requests if KV is down
		console.warn("[RateLimit] KV error, failing open:", error);
		return { allowed: true, remaining: config.limit, resetAt };
	}
}

// =============================================================================
// MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create rate limit middleware for a specific endpoint.
 *
 * @param endpointName - Key into RATE_LIMITS config
 * @param extractKey - Function to extract the rate limit key from the request.
 *                     Defaults to extracting tenantId from request body or params.
 */
export function rateLimitMiddleware(
	endpointName: string,
	extractKey?: (c: {
		req: {
			header: (name: string) => string | undefined;
			param: (name: string) => string | undefined;
		};
	}) => string,
): MiddlewareHandler<{ Bindings: Env }> {
	const config = RATE_LIMITS[endpointName];
	if (!config) {
		throw new Error(`No rate limit config for endpoint: ${endpointName}`);
	}

	return async (c, next) => {
		const kv = c.env.CACHE_KV;
		if (!kv) {
			// No KV binding — skip rate limiting
			await next();
			return;
		}

		// Extract key: use provided function, or fall back to IP
		const key = extractKey ? extractKey(c) : c.req.header("CF-Connecting-IP") || "unknown";

		const result = await checkRateLimit(kv, key, config);

		if (!result.allowed) {
			return billingError(BILLING_ERRORS.RATE_LIMITED);
		}

		// Add rate limit headers
		c.header("X-RateLimit-Limit", String(config.limit));
		c.header("X-RateLimit-Remaining", String(result.remaining));
		c.header("X-RateLimit-Reset", String(result.resetAt));

		await next();
	};
}

/**
 * Extract client IP for webhook rate limiting
 */
export function extractClientIP(c: {
	req: { header: (name: string) => string | undefined };
}): string {
	return (
		c.req.header("CF-Connecting-IP") ||
		c.req.header("X-Real-IP") ||
		c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown"
	);
}
