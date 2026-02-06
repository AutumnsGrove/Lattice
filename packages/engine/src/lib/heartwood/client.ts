/**
 * GroveAuth Client
 *
 * Client library for integrating with GroveAuth authentication service.
 * Use this to handle OAuth flows, token management, and subscription checks.
 */

import type {
  GroveAuthConfig,
  TokenResponse,
  TokenInfo,
  UserInfo,
  LoginUrlResult,
  SubscriptionResponse,
  CanPostResponse,
  SubscriptionTier,
  OAuthProvider,
  Passkey,
  PasskeyRegisterOptions,
  PasskeyAuthOptions,
  TwoFactorStatus,
  TwoFactorEnableResponse,
  TwoFactorVerifyResponse,
  LinkedAccount,
  AuthError,
} from "./types.js";
import { GroveAuthError } from "./types.js";

const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

/**
 * Standard error response shape from GroveAuth API.
 * Used for type-safe error handling instead of `as any`.
 */
interface ApiErrorResponse {
  error?: string;
  error_description?: string;
  message?: string;
}

// =============================================================================
// PKCE HELPERS
// =============================================================================

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(
    randomValues,
    (byte) => charset[byte % charset.length],
  ).join("");
}

/**
 * Generate a code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generate a code challenge from a code verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // URL-safe base64
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomUUID();
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate a user ID to prevent injection attacks.
 * User IDs should only contain safe characters.
 *
 * Valid characters: alphanumeric, underscore, hyphen
 * Max length: 128 characters (UUIDs are 36 chars)
 */
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== "string") {
    throw new GroveAuthError("invalid_user_id", "User ID is required", 400);
  }
  if (!USER_ID_PATTERN.test(userId)) {
    throw new GroveAuthError(
      "invalid_user_id",
      "User ID contains invalid characters",
      400,
    );
  }
}

// =============================================================================
// GROVEAUTH CLIENT CLASS
// =============================================================================

export class GroveAuthClient {
  private config: Required<GroveAuthConfig>;

  /**
   * In-memory cache for subscription data.
   * Reduces API calls for frequently accessed subscription info.
   * Cache entries expire after 5 minutes (configurable via cacheTTL).
   */
  private subscriptionCache = new Map<
    string,
    { data: SubscriptionResponse; expires: number }
  >();
  private cacheTTL: number;

  /**
   * Track in-flight subscription requests to prevent duplicate API calls.
   * When multiple concurrent requests come in for the same user,
   * they all wait on the same promise instead of making redundant API calls.
   */
  private subscriptionPromises = new Map<
    string,
    Promise<SubscriptionResponse>
  >();

  constructor(config: GroveAuthConfig & { cacheTTL?: number }) {
    this.config = {
      ...config,
      authBaseUrl: config.authBaseUrl || DEFAULT_AUTH_URL,
    };
    // Default cache TTL: 5 minutes (300000ms)
    this.cacheTTL = config.cacheTTL ?? 300000;
  }

  /**
   * Clear subscription cache for a specific user or all users
   */
  clearSubscriptionCache(userId?: string): void {
    if (userId) {
      // Clear specific user's cache entries
      for (const key of this.subscriptionCache.keys()) {
        if (key.includes(userId)) {
          this.subscriptionCache.delete(key);
        }
      }
    } else {
      this.subscriptionCache.clear();
    }
  }

  /**
   * Clean up expired cache entries to prevent memory leaks.
   * Call periodically in long-running processes.
   *
   * @returns Number of entries removed
   */
  cleanupExpiredCache(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.subscriptionCache.entries()) {
      if (now >= entry.expires) {
        this.subscriptionCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Helper for exponential backoff retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxRetries?: number; baseDelayMs?: number } = {},
  ): Promise<T> {
    const { maxRetries = 3, baseDelayMs = 1000 } = options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors (client errors)
        if (
          error instanceof GroveAuthError &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // Don't retry if we've exhausted attempts
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error("Operation failed after retries");
  }

  // ===========================================================================
  // AUTHENTICATION FLOW
  // ===========================================================================

  /**
   * Generate a login URL with PKCE
   * Store the state and codeVerifier in a secure cookie for verification
   */
  async getLoginUrl(): Promise<LoginUrlResult> {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      url: `${this.config.authBaseUrl}/login?${params}`,
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange an authorization code for tokens
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authBaseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    // Parse response body once (streams can only be consumed once)
    const data = await response.json();

    if (!response.ok) {
      const error = data as AuthError;
      throw new GroveAuthError(
        error.error || "token_error",
        error.error_description || error.message || "Failed to exchange code",
        response.status,
      );
    }

    return data as TokenResponse;
  }

  /**
   * Refresh an access token using a refresh token.
   * Includes automatic retry with exponential backoff for transient failures.
   *
   * @param refreshToken - The refresh token to use
   * @param options.maxRetries - Maximum retry attempts (default: 3)
   * @returns New token response with fresh access token
   * @throws GroveAuthError if refresh fails after all retries
   */
  async refreshToken(
    refreshToken: string,
    options: { maxRetries?: number } = {},
  ): Promise<TokenResponse> {
    return this.withRetry(
      async () => {
        const response = await fetch(
          `${this.config.authBaseUrl}/token/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: this.config.clientId,
              client_secret: this.config.clientSecret,
            }),
          },
        );

        // Parse response body once (streams can only be consumed once)
        const data = await response.json();

        if (!response.ok) {
          const error = data as AuthError;
          throw new GroveAuthError(
            error.error || "refresh_error",
            error.error_description ||
              error.message ||
              "Failed to refresh token",
            response.status,
          );
        }

        return data as TokenResponse;
      },
      { maxRetries: options.maxRetries ?? 3 },
    );
  }

  /**
   * Check if a token is expired or about to expire.
   * Returns true if token expires within the buffer period.
   *
   * @param expiresAt - ISO timestamp of token expiration
   * @param bufferSeconds - Refresh this many seconds before expiry (default: 60)
   */
  isTokenExpiringSoon(expiresAt: string | Date, bufferSeconds = 60): boolean {
    const expiresTime = new Date(expiresAt).getTime();
    const bufferTime = bufferSeconds * 1000;
    return Date.now() >= expiresTime - bufferTime;
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const response = await fetch(`${this.config.authBaseUrl}/token/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as AuthError;
      throw new GroveAuthError(
        error.error || "revoke_error",
        error.error_description || error.message || "Failed to revoke token",
        response.status,
      );
    }
  }

  // ===========================================================================
  // TOKEN VERIFICATION
  // ===========================================================================

  /**
   * Verify an access token
   */
  async verifyToken(accessToken: string): Promise<TokenInfo | null> {
    const response = await fetch(`${this.config.authBaseUrl}/verify`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as TokenInfo;

    if (!data.active) {
      return null;
    }

    return data;
  }

  /**
   * Get user info using an access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.config.authBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as AuthError;
      throw new GroveAuthError(
        error.error || "userinfo_error",
        error.error_description || error.message || "Failed to get user info",
        response.status,
      );
    }

    return response.json() as Promise<UserInfo>;
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  /**
   * Get the current user's subscription
   */
  async getSubscription(accessToken: string): Promise<SubscriptionResponse> {
    const response = await fetch(`${this.config.authBaseUrl}/subscription`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as AuthError;
      throw new GroveAuthError(
        error.error || "subscription_error",
        error.message || "Failed to get subscription",
        response.status,
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Get a specific user's subscription (with caching and deduplication)
   *
   * Features:
   * - In-memory caching with configurable TTL
   * - Request deduplication: concurrent requests share the same API call
   * - Automatic cache invalidation on mutations
   *
   * @param accessToken - Valid access token
   * @param userId - User ID to get subscription for
   * @param skipCache - If true, bypasses cache and fetches fresh data
   */
  async getUserSubscription(
    accessToken: string,
    userId: string,
    skipCache = false,
  ): Promise<SubscriptionResponse> {
    validateUserId(userId);

    const cacheKey = `sub:${userId}`;

    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cached = this.subscriptionCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }

      // Check for in-flight request to prevent redundant API calls
      const inFlight = this.subscriptionPromises.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }
    }

    // Create the fetch promise
    const fetchPromise = this._fetchUserSubscription(
      accessToken,
      userId,
      cacheKey,
    );

    // Store the promise so concurrent requests can share it
    this.subscriptionPromises.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      // Clean up the in-flight tracking
      this.subscriptionPromises.delete(cacheKey);
    }
  }

  /**
   * Internal method to fetch user subscription from API
   */
  private async _fetchUserSubscription(
    accessToken: string,
    userId: string,
    cacheKey: string,
  ): Promise<SubscriptionResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "subscription_error",
        data.message || "Failed to get subscription",
        response.status,
      );
    }

    const data = (await response.json()) as SubscriptionResponse;

    // Cache the result
    this.subscriptionCache.set(cacheKey, {
      data,
      expires: Date.now() + this.cacheTTL,
    });

    return data;
  }

  /**
   * Check if a user can create a new post
   */
  async canUserCreatePost(
    accessToken: string,
    userId: string,
  ): Promise<CanPostResponse> {
    validateUserId(userId);
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/can-post`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "limit_check_error",
        data.message || "Failed to check post limit",
        response.status,
      );
    }

    return response.json() as Promise<CanPostResponse>;
  }

  /**
   * Increment post count after creating a post
   * Automatically invalidates subscription cache for this user
   */
  async incrementPostCount(
    accessToken: string,
    userId: string,
  ): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "increment" }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "count_error",
        data.message || "Failed to update post count",
        response.status,
      );
    }

    const data = (await response.json()) as SubscriptionResponse;

    // Update cache with fresh data
    this.subscriptionCache.set(`sub:${userId}`, {
      data,
      expires: Date.now() + this.cacheTTL,
    });

    return data;
  }

  /**
   * Decrement post count after deleting a post
   * Automatically updates subscription cache for this user
   */
  async decrementPostCount(
    accessToken: string,
    userId: string,
  ): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "decrement" }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "count_error",
        data.message || "Failed to update post count",
        response.status,
      );
    }

    const data = (await response.json()) as SubscriptionResponse;

    // Update cache with fresh data
    this.subscriptionCache.set(`sub:${userId}`, {
      data,
      expires: Date.now() + this.cacheTTL,
    });

    return data;
  }

  /**
   * Update post count to a specific value
   * Automatically updates subscription cache for this user
   */
  async setPostCount(
    accessToken: string,
    userId: string,
    count: number,
  ): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "count_error",
        data.message || "Failed to update post count",
        response.status,
      );
    }

    const data = (await response.json()) as SubscriptionResponse;

    // Update cache with fresh data
    this.subscriptionCache.set(`sub:${userId}`, {
      data,
      expires: Date.now() + this.cacheTTL,
    });

    return data;
  }

  /**
   * Update a user's subscription tier
   * Automatically updates subscription cache for this user
   */
  async updateTier(
    accessToken: string,
    userId: string,
    tier: SubscriptionTier,
  ): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(
      `${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/tier`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "tier_error",
        data.message || "Failed to update tier",
        response.status,
      );
    }

    const data = (await response.json()) as SubscriptionResponse;

    // Update cache with fresh data
    this.subscriptionCache.set(`sub:${userId}`, {
      data,
      expires: Date.now() + this.cacheTTL,
    });

    return data;
  }

  // ===========================================================================
  // OAUTH - SOCIAL PROVIDERS
  // ===========================================================================

  /**
   * Initiate social OAuth sign-in.
   * Returns the redirect URL to start the OAuth flow.
   */
  async signInWithSocial(provider: OAuthProvider): Promise<{ url: string }> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/sign-in/social`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
        }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "oauth_error",
        data.message || `Failed to initiate ${provider} sign-in`,
        response.status,
      );
    }

    return response.json() as Promise<{ url: string }>;
  }

  // ===========================================================================
  // PASSKEY AUTHENTICATION
  // ===========================================================================

  /**
   * Sign in with a passkey (WebAuthn).
   * Returns authentication options for the browser to use.
   */
  async getPasskeyAuthOptions(): Promise<PasskeyAuthOptions> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/sign-in/passkey`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
        }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_error",
        data.message || "Failed to get passkey authentication options",
        response.status,
      );
    }

    return response.json() as Promise<PasskeyAuthOptions>;
  }

  /**
   * Verify passkey authentication and exchange for tokens.
   *
   * IMPORTANT: This method should only be called from server-side code
   * (e.g., SvelteKit server endpoints). Never expose passkey verification
   * directly to client-side JavaScript.
   */
  async verifyPasskeyAuth(credential: {
    id: string;
    rawId: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle?: string;
    };
    type: string;
  }): Promise<TokenResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/sign-in/passkey/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential,
          client_id: this.config.clientId,
        }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_verify_error",
        data.message || "Failed to verify passkey authentication",
        response.status,
      );
    }

    return response.json() as Promise<TokenResponse>;
  }

  /**
   * Get passkey registration options for adding a new passkey.
   */
  async getPasskeyRegisterOptions(
    accessToken: string,
  ): Promise<PasskeyRegisterOptions> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/passkey/generate-register-options`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_error",
        data.message || "Failed to get passkey registration options",
        response.status,
      );
    }

    return response.json() as Promise<PasskeyRegisterOptions>;
  }

  /**
   * Verify and register a new passkey.
   */
  async verifyPasskeyRegistration(
    accessToken: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        attestationObject: string;
        clientDataJSON: string;
      };
      type: string;
    },
    name?: string,
  ): Promise<Passkey> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/passkey/verify-registration`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential, name }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_register_error",
        data.message || "Failed to register passkey",
        response.status,
      );
    }

    return response.json() as Promise<Passkey>;
  }

  /**
   * List all passkeys for the authenticated user.
   */
  async listPasskeys(accessToken: string): Promise<Passkey[]> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/passkey/list-user-passkeys`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_list_error",
        data.message || "Failed to list passkeys",
        response.status,
      );
    }

    return response.json() as Promise<Passkey[]>;
  }

  /**
   * Delete a passkey.
   */
  async deletePasskey(accessToken: string, passkeyId: string): Promise<void> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/passkey/delete-passkey`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passkeyId }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "passkey_delete_error",
        data.message || "Failed to delete passkey",
        response.status,
      );
    }
  }

  // ===========================================================================
  // TWO-FACTOR AUTHENTICATION
  // ===========================================================================

  /**
   * Get the current 2FA status for the authenticated user.
   */
  async getTwoFactorStatus(accessToken: string): Promise<TwoFactorStatus> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/two-factor/get-status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "2fa_status_error",
        data.message || "Failed to get 2FA status",
        response.status,
      );
    }

    return response.json() as Promise<TwoFactorStatus>;
  }

  /**
   * Enable 2FA for the authenticated user.
   * Returns the TOTP secret and QR code URL for setup.
   */
  async enableTwoFactor(accessToken: string): Promise<TwoFactorEnableResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/two-factor/enable`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "2fa_enable_error",
        data.message || "Failed to enable 2FA",
        response.status,
      );
    }

    return response.json() as Promise<TwoFactorEnableResponse>;
  }

  /**
   * Verify a TOTP code to complete 2FA setup or during sign-in.
   */
  async verifyTwoFactorCode(
    accessToken: string,
    code: string,
  ): Promise<TwoFactorVerifyResponse> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/two-factor/verify-totp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "2fa_verify_error",
        data.message || "Failed to verify 2FA code",
        response.status,
      );
    }

    return response.json() as Promise<TwoFactorVerifyResponse>;
  }

  /**
   * Disable 2FA for the authenticated user.
   */
  async disableTwoFactor(accessToken: string, code: string): Promise<void> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/two-factor/disable`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "2fa_disable_error",
        data.message || "Failed to disable 2FA",
        response.status,
      );
    }
  }

  /**
   * Generate new backup codes (invalidates existing codes).
   */
  async generateBackupCodes(accessToken: string): Promise<string[]> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/two-factor/generate-backup-codes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "backup_codes_error",
        data.message || "Failed to generate backup codes",
        response.status,
      );
    }

    const data = (await response.json()) as { backupCodes: string[] };
    return data.backupCodes;
  }

  // ===========================================================================
  // LINKED ACCOUNTS
  // ===========================================================================

  /**
   * Get all linked OAuth accounts for the authenticated user.
   */
  async getLinkedAccounts(accessToken: string): Promise<LinkedAccount[]> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/linked-accounts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "linked_accounts_error",
        data.message || "Failed to get linked accounts",
        response.status,
      );
    }

    return response.json() as Promise<LinkedAccount[]>;
  }

  /**
   * Unlink an OAuth provider from the account.
   */
  async unlinkAccount(
    accessToken: string,
    provider: OAuthProvider,
  ): Promise<void> {
    const response = await fetch(
      `${this.config.authBaseUrl}/api/auth/linked-accounts/${provider}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new GroveAuthError(
        data.error || "unlink_error",
        data.message || `Failed to unlink ${provider} account`,
        response.status,
      );
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a GroveAuth client instance
 */
export function createGroveAuthClient(
  config: GroveAuthConfig,
): GroveAuthClient {
  return new GroveAuthClient(config);
}
