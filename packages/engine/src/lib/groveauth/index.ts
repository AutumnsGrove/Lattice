/**
 * GroveAuth Client Module
 *
 * Client library for integrating with GroveAuth authentication service.
 *
 * @example
 * ```typescript
 * import { createGroveAuthClient } from '@autumnsgrove/groveengine/groveauth';
 *
 * const auth = createGroveAuthClient({
 *   clientId: 'your-client-id',
 *   clientSecret: env.GROVEAUTH_CLIENT_SECRET,
 *   redirectUri: 'https://yoursite.com/auth/callback',
 * });
 *
 * // Generate login URL
 * const { url, state, codeVerifier } = await auth.getLoginUrl();
 *
 * // Exchange code for tokens
 * const tokens = await auth.exchangeCode(code, codeVerifier);
 *
 * // Check post limits
 * const { allowed, status } = await auth.canUserCreatePost(tokens.access_token, userId);
 * ```
 */

// Client
export { GroveAuthClient, createGroveAuthClient } from './client.js';
export { generateCodeVerifier, generateCodeChallenge, generateState } from './client.js';

// Types
export type {
  GroveAuthConfig,
  TokenResponse,
  TokenInfo,
  UserInfo,
  LoginUrlResult,
  UserSubscription,
  SubscriptionStatus,
  SubscriptionResponse,
  CanPostResponse,
  SubscriptionTier,
  AuthError,
  // OAuth types
  OAuthProvider,
  // Passkey types
  Passkey,
  PasskeyRegisterOptions,
  PasskeyAuthOptions,
  // 2FA types
  TwoFactorStatus,
  TwoFactorEnableResponse,
  TwoFactorVerifyResponse,
  // Linked accounts
  LinkedAccount,
} from './types.js';

export { GroveAuthError, TIER_POST_LIMITS, TIER_NAMES } from './types.js';

// Post limit helpers
export {
  getQuotaDescription,
  getQuotaUrgency,
  getSuggestedActions,
  getUpgradeRecommendation,
  getQuotaWidgetData,
  getPreSubmitCheck,
} from './limits.js';

export type { QuotaWidgetData, PreSubmitCheckResult } from './limits.js';

// Color utilities
export {
  STATUS_COLORS,
  ALERT_VARIANTS,
  getStatusColorFromPercentage,
  getAlertVariantFromColor,
} from './colors.js';

export type { StatusColor, AlertVariant } from './colors.js';

// Rate limiting
export {
  RateLimiter,
  RateLimitError,
  withRateLimit,
  DEFAULT_RATE_LIMITS,
} from './rate-limit.js';

// Validation utilities
export {
  isValidTotpCode,
  isValidCredential,
  getRequiredEnv,
  TOTP_CODE_LENGTH,
  TOTP_CODE_REGEX,
} from './validation.js';

export type { PasskeyCredential } from './validation.js';
