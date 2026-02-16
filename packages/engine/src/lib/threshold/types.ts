/**
 * Threshold — Core Types
 *
 * Defines the storage-agnostic interface for rate limiting.
 * All storage backends and framework adapters build on these types.
 */

/** Result from any rate limit check, regardless of storage backend */
export interface ThresholdResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter?: number; // Seconds until reset (only when denied)
}

/** Configuration for a single rate limit check */
export interface ThresholdCheckOptions {
  /** Unique key identifying what's being limited (e.g., "auth/login:192.168.1.1") */
  key: string;
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /**
   * Fail behavior on storage errors.
   * - "open" (default): Allow request, log error
   * - "closed": Deny request with 503. Use for auth-critical paths.
   */
  failMode?: "open" | "closed";
}

/** Storage adapter interface. All backends implement this. */
export interface ThresholdStore {
  check(options: ThresholdCheckOptions): Promise<ThresholdResult>;
}
