/**
 * Threshold — Unified Rate Limiting for Grove
 *
 * The central orchestrator that ties storage, config, and abuse tracking
 * together into a single, clean API.
 *
 * @example
 * ```typescript
 * import { Threshold, ThresholdKVStore } from "@autumnsgrove/lattice/threshold";
 *
 * const threshold = new Threshold({
 *   store: new ThresholdKVStore(platform.env.CACHE),
 * });
 *
 * // Simple check
 * const result = await threshold.check({ key: `upload:${userId}`, limit: 20, windowSeconds: 3600 });
 *
 * // Tier-aware check
 * const result = await threshold.checkTier("seedling", "writes", userId);
 *
 * // Endpoint-aware check (auto-detects limits from config)
 * const result = await threshold.checkEndpoint("POST", "/api/posts", userId);
 * ```
 */

import type {
  ThresholdStore,
  ThresholdResult,
  ThresholdCheckOptions,
} from "./types.js";
import type {
  TierKey,
  TierRateLimits,
  RateLimitConfig,
} from "../config/tiers.js";
import { TIERS } from "../config/tiers.js";
import {
  ENDPOINT_RATE_LIMITS,
  ENDPOINT_MAP,
  type EndpointKey,
} from "./config.js";
import {
  type AbuseState,
  type ViolationResult,
  getAbuseState,
  recordViolation,
  isBanned,
  getBanRemaining,
  clearAbuseState,
} from "./abuse.js";

// ============================================================================
// Types
// ============================================================================

export interface ThresholdOptions {
  /** Primary storage backend */
  store: ThresholdStore;
  /** Optional KV for abuse tracking (falls back to skipping abuse checks) */
  abuseKV?: KVNamespace;
}

// ============================================================================
// Threshold Class
// ============================================================================

export class Threshold {
  private store: ThresholdStore;
  private abuseKV?: KVNamespace;

  constructor(options: ThresholdOptions) {
    this.store = options.store;
    this.abuseKV = options.abuseKV;
  }

  // ===========================================================================
  // Core Check
  // ===========================================================================

  /** Check a rate limit. The lowest-level call. */
  async check(options: ThresholdCheckOptions): Promise<ThresholdResult> {
    return this.store.check(options);
  }

  // ===========================================================================
  // Tier-Aware Check
  // ===========================================================================

  /**
   * Check rate limit based on subscription tier.
   * Looks up limits from the unified tier config.
   */
  async checkTier(
    tier: TierKey,
    category: keyof TierRateLimits,
    identifier: string,
  ): Promise<ThresholdResult> {
    const config = TIERS[tier].rateLimits[category];
    return this.store.check({
      key: `tier:${tier}:${category}:${identifier}`,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
    });
  }

  // ===========================================================================
  // Endpoint-Aware Check
  // ===========================================================================

  /**
   * Check rate limit for a specific endpoint.
   * Maps method + path to endpoint presets.
   * Auth endpoints automatically use failMode: "closed".
   */
  async checkEndpoint(
    method: string,
    pathname: string,
    identifier: string,
    overrides?: Partial<RateLimitConfig>,
  ): Promise<ThresholdResult> {
    const mapKey = `${method}:${pathname}`;
    const endpointKey: EndpointKey = ENDPOINT_MAP[mapKey] ?? "default";
    const config = ENDPOINT_RATE_LIMITS[endpointKey];

    return this.store.check({
      key: `ep:${endpointKey}:${identifier}`,
      limit: overrides?.limit ?? config.limit,
      windowSeconds: overrides?.windowSeconds ?? config.windowSeconds,
      failMode: endpointKey.startsWith("auth/") ? "closed" : "open",
    });
  }

  // ===========================================================================
  // Tenant Check
  // ===========================================================================

  /**
   * Check rate limit for a tenant based on their subscription tier.
   * Categorizes the request automatically from method + path.
   */
  async checkTenant(
    tenantId: string,
    tier: TierKey,
    method: string,
    pathname: string,
  ): Promise<ThresholdResult> {
    const category = categorizeRequest(method, pathname);
    return this.checkTier(tier, category, `tenant:${tenantId}`);
  }

  // ===========================================================================
  // Abuse Tracking
  // ===========================================================================

  /**
   * Check if a user is banned before performing a rate limit check.
   * Requires abuseKV to be configured.
   */
  async checkWithAbuse(
    options: ThresholdCheckOptions,
    userId: string,
  ): Promise<ThresholdResult & { warning?: boolean; banned?: boolean }> {
    // Check ban status first
    if (this.abuseKV) {
      const state = await getAbuseState(this.abuseKV, userId);
      if (isBanned(state)) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: state.bannedUntil!,
          retryAfter: getBanRemaining(state),
          banned: true,
        };
      }
    }

    // Perform rate limit check
    const result = await this.store.check(options);

    // Record violation if denied
    if (!result.allowed && this.abuseKV) {
      const violation = await recordViolation(this.abuseKV, userId);
      return {
        ...result,
        warning: violation.warning,
        banned: violation.banned,
      };
    }

    return result;
  }

  /**
   * Clear abuse state for a user. Admin action.
   */
  async clearAbuse(userId: string): Promise<void> {
    if (this.abuseKV) {
      await clearAbuseState(this.abuseKV, userId);
    }
  }
}

// =============================================================================
// Request Categorization
// =============================================================================

/**
 * Determine the rate limit category for a request.
 * Used by checkTenant() to auto-categorize.
 */
export function categorizeRequest(
  method: string,
  pathname: string,
): keyof TierRateLimits {
  if (
    pathname.startsWith("/api/ai/") ||
    pathname.startsWith("/api/wisp") ||
    pathname.startsWith("/api/grove/wisp")
  ) {
    return "ai";
  }
  if (
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/images") ||
    pathname.startsWith("/api/cdn")
  ) {
    return "uploads";
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return "writes";
  }
  return "requests";
}
