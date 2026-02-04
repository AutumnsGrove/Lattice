/**
 * Login Graft Type Definitions
 *
 * Types for the LoginGraft component system.
 * Provides unified login UI across all Grove properties with PKCE OAuth support.
 */

import type { Snippet } from "svelte";
import type { BaseGraftProps } from "../types.js";

// =============================================================================
// AUTH PROVIDER TYPES
// =============================================================================

/**
 * Supported authentication providers.
 * Currently Google and Passkey are fully implemented.
 */
export type AuthProvider = "google" | "github" | "email" | "passkey";

/**
 * Configuration for a single auth provider.
 */
export interface ProviderConfig {
  /** Provider identifier */
  id: AuthProvider;

  /** Human-readable provider name */
  name: string;

  /** Whether this provider is currently available */
  available: boolean;

  /** Optional description for the provider */
  description?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Display variant for LoginGraft.
 */
export type LoginVariant = "default" | "compact" | "fullpage";

/**
 * Props for the main LoginGraft orchestrator component.
 *
 * With Better Auth migration, OAuth flows redirect directly to GroveAuth's
 * Better Auth endpoints. The tenant site only needs to verify the session
 * cookie after the callback.
 */
export interface LoginGraftProps extends BaseGraftProps {
  /**
   * Which providers to show (order matters for display).
   * Defaults to ['google'] since that's the only fully supported provider.
   */
  providers?: AuthProvider[];

  /**
   * URL to redirect after successful authentication.
   * Defaults to '/arbor'.
   */
  returnTo?: string;

  /**
   * Client ID for OAuth (for multi-tenant scenarios).
   * @deprecated Better Auth uses the origin domain for client identification.
   */
  clientId?: string;

  /**
   * Display variant.
   * - 'default': Card with providers and optional header/footer
   * - 'compact': Minimal button only
   * - 'fullpage': Centered card with logo and branding
   */
  variant?: LoginVariant;

  /**
   * Base URL for the login endpoint.
   * @deprecated Better Auth redirects directly to GROVEAUTH_URLS.socialSignIn.
   * This prop is ignored in the Better Auth flow.
   */
  loginUrl?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Customization snippets
  // ─────────────────────────────────────────────────────────────────────────

  /** Custom header content above the provider buttons */
  header?: Snippet;

  /** Custom footer content below the provider buttons */
  footer?: Snippet;

  /** Custom content for the logo area (fullpage variant only) */
  logo?: Snippet;
}

/**
 * Props for ProviderIcon component.
 */
export interface ProviderIconProps {
  /** Which provider icon to show */
  provider: AuthProvider;

  /** Icon size in pixels */
  size?: number;

  /** Additional CSS classes */
  class?: string;
}

// =============================================================================
// PASSKEY TYPES
// =============================================================================

/**
 * Result of a successful passkey authentication.
 */
export interface PasskeyAuthResult {
  /** Whether authentication was successful */
  success: boolean;

  /** URL to redirect to after successful auth */
  redirectTo?: string;

  /** Error message if authentication failed */
  error?: string;
}

/**
 * Props for PasskeyButton component.
 */
export interface PasskeyButtonProps extends BaseGraftProps {
  /** URL to redirect after successful authentication */
  returnTo?: string;

  /** Callback fired on successful authentication */
  onSuccess?: (result: PasskeyAuthResult) => void;

  /** Callback fired on authentication error */
  onError?: (error: string) => void;

  /** Button size variant */
  size?: "sm" | "md" | "lg";
}

// =============================================================================
// SERVER HANDLER TYPES
// =============================================================================

/**
 * Configuration for createLoginHandler factory.
 */
export interface LoginHandlerConfig {
  /**
   * OAuth client ID registered with GroveAuth.
   */
  clientId: string;

  /**
   * Base URL for GroveAuth login page.
   * @example 'https://auth.grove.place'
   */
  authUrl: string;

  /**
   * Default OAuth provider if none specified in request.
   * @default 'google'
   */
  defaultProvider?: AuthProvider;

  /**
   * Default URL to redirect to after successful auth.
   * @default '/arbor'
   */
  defaultReturnTo?: string;
}

/**
 * Configuration for createCallbackHandler factory.
 *
 * With Better Auth migration, most options are no longer needed:
 * - clientId: Better Auth uses origin for client identification
 * - clientSecretEnvVar: No token exchange needed
 * - authApiUrl: Better Auth handles the full flow
 * - cookieDomain: Better Auth sets cookies with correct domain
 */
export interface CallbackHandlerConfig {
  /**
   * OAuth client ID registered with GroveAuth.
   * @deprecated Better Auth uses origin for client identification.
   */
  clientId?: string;

  /**
   * Environment variable name for the client secret.
   * @deprecated No token exchange needed - Better Auth handles it.
   */
  clientSecretEnvVar?: string;

  /**
   * Base URL for GroveAuth token API.
   * @deprecated Better Auth handles the full flow.
   */
  authApiUrl?: string;

  /**
   * Default URL to redirect to after successful auth.
   * @default '/arbor'
   */
  defaultReturnTo?: string;

  /**
   * Cookie domain for cross-subdomain auth.
   * @deprecated Better Auth sets cookies with correct domain.
   */
  cookieDomain?: string;

  /**
   * KV namespace key for rate limiting.
   * If not provided, rate limiting is disabled.
   * @default 'CACHE_KV'
   */
  rateLimitKvKey?: string;
}

// =============================================================================
// PKCE TYPES
// =============================================================================

/**
 * PKCE (Proof Key for Code Exchange) values for OAuth.
 */
export interface PKCEValues {
  /** Random string used to generate the challenge */
  codeVerifier: string;

  /** SHA-256 hash of the verifier, base64url encoded */
  codeChallenge: string;
}

/**
 * Auth state stored in cookies during OAuth flow.
 */
export interface AuthCookieState {
  /** CSRF protection state value */
  state: string;

  /** PKCE code verifier */
  codeVerifier: string;

  /** URL to redirect to after auth */
  returnTo: string;
}
