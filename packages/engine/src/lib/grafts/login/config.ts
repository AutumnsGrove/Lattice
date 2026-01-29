/**
 * Login Graft Configuration
 *
 * Provider registry and default configuration for the LoginGraft.
 * Currently only Google OAuth is fully supported.
 */

import type { AuthProvider, ProviderConfig } from "./types.js";

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

/**
 * Registry of all supported auth providers with their configuration.
 */
export const PROVIDERS: Record<AuthProvider, ProviderConfig> = {
  google: {
    id: "google",
    name: "Google",
    available: true,
    description: "Sign in with your Google account",
  },
  github: {
    id: "github",
    name: "GitHub",
    available: false, // Not yet implemented
    description: "Sign in with your GitHub account",
  },
  email: {
    id: "email",
    name: "Email",
    available: false, // Not yet implemented
    description: "Sign in with email magic link",
  },
};

/**
 * Get the configuration for a provider.
 */
export function getProviderConfig(provider: AuthProvider): ProviderConfig {
  return PROVIDERS[provider];
}

/**
 * Get the display name for a provider.
 */
export function getProviderName(provider: AuthProvider): string {
  return PROVIDERS[provider]?.name ?? provider;
}

/**
 * Check if a provider is currently available.
 */
export function isProviderAvailable(provider: AuthProvider): boolean {
  return PROVIDERS[provider]?.available ?? false;
}

/**
 * Get all available providers.
 */
export function getAvailableProviders(): AuthProvider[] {
  return (Object.keys(PROVIDERS) as AuthProvider[]).filter(
    (id) => PROVIDERS[id].available,
  );
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default providers to show if none specified.
 * Only includes providers that are fully implemented.
 */
export const DEFAULT_PROVIDERS: AuthProvider[] = ["google"];

/**
 * Default login endpoint URL.
 */
export const DEFAULT_LOGIN_URL = "/auth/login";

/**
 * Default return URL after successful auth.
 */
export const DEFAULT_RETURN_TO = "/admin";

/**
 * Default GroveAuth URLs.
 */
export const GROVEAUTH_URLS = {
  /** Frontend login page */
  auth: "https://auth.grove.place",
  /** Backend API for token exchange */
  api: "https://auth-api.grove.place",
} as const;

/**
 * Cookie names used in OAuth flow.
 */
export const AUTH_COOKIE_NAMES = {
  /** CSRF state */
  state: "auth_state",
  /** PKCE code verifier */
  codeVerifier: "auth_code_verifier",
  /** Return URL after auth */
  returnTo: "auth_return_to",
  /** Access token (set after successful auth) */
  accessToken: "access_token",
  /** Refresh token (set after successful auth) */
  refreshToken: "refresh_token",
  /** Session ID (set after successful auth) */
  session: "session",
} as const;

/**
 * Cookie options for OAuth flow cookies.
 *
 * NOTE: The `secure` flag is intentionally omitted from these defaults.
 * It is set dynamically by the handlers based on `isProduction(url)` to allow:
 * - localhost development (HTTP) → secure: false
 * - production (HTTPS) → secure: true
 *
 * This prevents breaking local development while maintaining security in production.
 */
export const AUTH_COOKIE_OPTIONS = {
  /** Options for temporary auth flow cookies (state, verifier, returnTo) */
  temporary: {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes
    // secure: set dynamically by handler
  },
  /** Options for session cookies */
  session: {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    // secure: set dynamically by handler
  },
} as const;
