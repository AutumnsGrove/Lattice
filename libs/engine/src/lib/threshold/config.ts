/**
 * Threshold — Rate Limit Configuration
 *
 * Single source of truth for all endpoint-specific rate limits.
 * Merges constants from engine config and Heartwood.
 *
 * Tier-based rate limits are NOT duplicated here — they live in
 * the unified tier config at config/tiers.ts and Threshold reads
 * them directly via checkTier().
 */

import type { RateLimitConfig } from "../config/tiers.js";

// ============================================================================
// Types
// ============================================================================

export type EndpointKey = keyof typeof ENDPOINT_RATE_LIMITS;

// ============================================================================
// Endpoint Rate Limits
// ============================================================================

/**
 * Endpoint-specific rate limits.
 * Applied in addition to tier-based limits.
 */
export const ENDPOINT_RATE_LIMITS = {
	// Auth endpoints (most sensitive, fail closed)
	"auth/login": { limit: 5, windowSeconds: 300 },
	"auth/callback": { limit: 10, windowSeconds: 300 },
	"auth/token": { limit: 20, windowSeconds: 60 },
	"auth/password-reset": { limit: 3, windowSeconds: 3600 },
	"auth/magic-link": { limit: 5, windowSeconds: 900 },
	"auth/verify": { limit: 100, windowSeconds: 60 },

	// Passkey endpoints
	"auth/passkey-register": { limit: 5, windowSeconds: 3600 },
	"auth/passkey-delete": { limit: 10, windowSeconds: 3600 },
	"auth/passkey-auth": { limit: 20, windowSeconds: 60 },

	// Session endpoints
	"session/validate": { limit: 30, windowSeconds: 60 },
	"session/revoke": { limit: 30, windowSeconds: 60 },
	"session/revoke-all": { limit: 3, windowSeconds: 3600 },
	"session/list": { limit: 30, windowSeconds: 60 },
	"session/delete": { limit: 20, windowSeconds: 60 },
	"session/check": { limit: 60, windowSeconds: 60 },
	"session/service": { limit: 100, windowSeconds: 60 },

	// Device code flow
	"device/init": { limit: 10, windowSeconds: 60 },
	"device/poll": { limit: 12, windowSeconds: 60 },

	// Admin endpoints
	"admin/general": { limit: 30, windowSeconds: 60 },

	// Subscription endpoints
	"subscription/read": { limit: 30, windowSeconds: 60 },
	"subscription/write": { limit: 10, windowSeconds: 60 },

	// Write endpoints
	"posts/create": { limit: 10, windowSeconds: 3600 },
	"posts/update": { limit: 30, windowSeconds: 3600 },
	"comments/create": { limit: 20, windowSeconds: 300 },

	// Upload endpoints
	"upload/image": { limit: 20, windowSeconds: 3600 },
	"upload/media": { limit: 10, windowSeconds: 3600 },

	// AI endpoints (expensive — app-level)
	"ai/wisp": { limit: 50, windowSeconds: 86400 },
	"ai/fireside": { limit: 50, windowSeconds: 86400 },
	"ai/draft": { limit: 20, windowSeconds: 86400 },

	// AI endpoints (Lumen gateway — per-caller)
	"lumen/inference": { limit: 60, windowSeconds: 60 },
	"lumen/embed": { limit: 120, windowSeconds: 60 },
	"lumen/moderate": { limit: 120, windowSeconds: 60 },
	"lumen/transcribe": { limit: 30, windowSeconds: 60 },

	// Data operations
	"export/data": { limit: 10, windowSeconds: 3600 },
	"export/zip-start": { limit: 3, windowSeconds: 86400 },
	"billing/operations": { limit: 20, windowSeconds: 3600 },

	// Feedback
	"trace/submit": { limit: 10, windowSeconds: 86400 },

	// Username checking (anti-enumeration)
	"check/username": { limit: 30, windowSeconds: 60 },

	// Username change availability check (engine-side)
	"username/check": { limit: 30, windowSeconds: 60 },

	// OG image generation
	"og/generate": { limit: 100, windowSeconds: 3600 },

	// Thorn behavioral layer signals
	"thorn/songbird-fail": { limit: 3, windowSeconds: 86400 }, // 3 failures/day
	"thorn/behavioral-block": { limit: 10, windowSeconds: 3600 }, // 10 blocks/hour

	// Default for unspecified endpoints
	default: { limit: 100, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>;

// ============================================================================
// Endpoint Mapping
// ============================================================================

/**
 * Map of HTTP method:path patterns to endpoint keys.
 * Used by Threshold.checkEndpoint() to auto-detect limits.
 */
export const ENDPOINT_MAP: Record<string, EndpointKey> = {
	"POST:/api/auth/login": "auth/login",
	"POST:/api/auth/token": "auth/token",
	"POST:/api/auth/password-reset": "auth/password-reset",
	"POST:/api/auth/magic-link": "auth/magic-link",
	"POST:/api/blooms": "posts/create",
	"PUT:/api/blooms": "posts/update",
	"PATCH:/api/blooms": "posts/update",
	"POST:/api/posts": "posts/create",
	"PUT:/api/posts": "posts/update",
	"PATCH:/api/posts": "posts/update",
	"POST:/api/comments": "comments/create",
	"POST:/api/upload": "upload/image",
	"POST:/api/images": "upload/image",
	"POST:/api/grove/wisp": "ai/wisp",
	"POST:/api/ai/wisp": "ai/wisp",
	"POST:/api/ai/fireside": "ai/fireside",
	"POST:/api/ai/draft": "ai/draft",
	"POST:/api/export": "export/data",
	"POST:/api/export/start": "export/zip-start",
	"POST:/api/billing": "billing/operations",
	"PATCH:/api/billing": "billing/operations",
	"PUT:/api/billing": "billing/operations",
	"POST:/api/trace": "trace/submit",
	"GET:/api/check-username": "check/username",
	"GET:/api/username/check": "username/check",

	// Lumen gateway routes
	"POST:/inference": "lumen/inference",
	"POST:/embed": "lumen/embed",
	"POST:/moderate": "lumen/moderate",
	"POST:/transcribe": "lumen/transcribe",
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get rate limit configuration for an endpoint by method and pathname.
 * Returns default limits if endpoint is not explicitly configured.
 */
export function getEndpointLimit(method: string, pathname: string): RateLimitConfig {
	const key = `${method}:${pathname}`;
	const endpointKey = ENDPOINT_MAP[key] ?? "default";
	return ENDPOINT_RATE_LIMITS[endpointKey];
}

/**
 * Get rate limit configuration by direct endpoint key.
 */
export function getEndpointLimitByKey(key: EndpointKey): RateLimitConfig {
	return ENDPOINT_RATE_LIMITS[key] ?? ENDPOINT_RATE_LIMITS["default"];
}
