/**
 * GroveAuth Client Types
 *
 * Type definitions for integrating with GroveAuth service.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface GroveAuthConfig {
  /** Client ID registered with GroveAuth */
  clientId: string;
  /** Client secret for token exchange (keep secure!) */
  clientSecret: string;
  /** OAuth callback URL for this application */
  redirectUri: string;
  /** GroveAuth base URL (defaults to https://auth.grove.place) */
  authBaseUrl?: string;
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface TokenInfo {
  active: boolean;
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  client_id?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  provider: "google" | "github" | "magic_code";
}

export interface LoginUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export type SubscriptionTier = "seedling" | "sapling" | "oak" | "evergreen";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  post_limit: number | null;
  post_count: number;
  grace_period_start: string | null;
  grace_period_days: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  custom_domain: string | null;
  custom_domain_verified: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  post_count: number;
  post_limit: number | null;
  posts_remaining: number | null;
  percentage_used: number | null;
  is_at_limit: boolean;
  is_in_grace_period: boolean;
  grace_period_days_remaining: number | null;
  can_create_post: boolean;
  upgrade_required: boolean;
}

export interface SubscriptionResponse {
  subscription: UserSubscription;
  status: SubscriptionStatus;
}

export interface CanPostResponse {
  allowed: boolean;
  status: SubscriptionStatus;
  subscription: UserSubscription;
}

// =============================================================================
// POST LIMIT CONSTANTS
// =============================================================================

/**
 * Post limits per subscription tier.
 *
 * Business rationale:
 * - Seedling (50 posts): Entry-level tier for curious newcomers testing the
 *   platform. Low commitment, creates upgrade path.
 * - Sapling (250 posts): For hobbyists and regular bloggers who know they'll
 *   stick around. ~1 post/day for 8 months.
 * - Oak (unlimited): For serious bloggers whose blog is part of their
 *   identity. Includes BYOD (bring your own domain) and full email.
 * - Evergreen (unlimited): Full-service tier for professionals. Includes domain
 *   search, registration, and priority support.
 *
 * Grace period: When users hit their limit, they have 14 days to upgrade or
 * delete posts before their account becomes read-only.
 *
 * @see docs/implementing-post-limits.md for full specification
 */
export const TIER_POST_LIMITS: Record<SubscriptionTier, number | null> = {
  seedling: 50,    // For curious newcomers trying blogging
  sapling: 250,    // For hobbyists and regular bloggers
  oak: null,       // Unlimited for serious bloggers
  evergreen: null, // Unlimited for professionals
};

/**
 * Human-readable tier names for UI display.
 */
export const TIER_NAMES: Record<SubscriptionTier, string> = {
  seedling: "Seedling",
  sapling: "Sapling",
  oak: "Oak",
  evergreen: "Evergreen",
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * OAuth/API error response structure from GroveAuth.
 * Used to parse error responses from the authentication API.
 *
 * @example
 * ```typescript
 * const response = await fetch('/token');
 * if (!response.ok) {
 *   const error: AuthError = await response.json();
 *   console.error(error.error, error.error_description);
 * }
 * ```
 */
export interface AuthError {
  /** OAuth error code (e.g., 'invalid_grant', 'access_denied') */
  error: string;
  /** Human-readable error description (OAuth standard) */
  error_description?: string;
  /** Alternative message field used by some endpoints */
  message?: string;
}

/**
 * Client-side error class for GroveAuth operations.
 * Thrown when authentication or subscription operations fail.
 */
export class GroveAuthError extends Error {
  /** Error code (e.g., 'invalid_user_id', 'subscription_error') */
  public readonly code: string;
  /** HTTP status code from the response */
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = "GroveAuthError";
    this.code = code;
    this.statusCode = statusCode;
  }

  /** Alias for statusCode for compatibility */
  get status(): number {
    return this.statusCode;
  }
}
