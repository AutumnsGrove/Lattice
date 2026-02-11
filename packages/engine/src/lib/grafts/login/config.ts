/**
 * Login Graft Configuration
 *
 * Provider registry and default configuration for the LoginGraft.
 * Includes all three fully implemented providers: Google OAuth, Passkeys, and Email magic links.
 */

import type { AuthProvider, ProviderConfig } from "./types.js";
import { AUTH_HUB_URL } from "../../config/auth.js";

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
    available: true,
    description: "Sign in with email magic link",
  },
  passkey: {
    id: "passkey",
    name: "Passkey",
    available: true,
    description: "Sign in with Face ID, Touch ID, or Windows Hello",
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
 * Includes all fully implemented providers: Google OAuth, Passkeys, and Email magic links.
 */
export const DEFAULT_PROVIDERS: AuthProvider[] = ["google", "passkey", "email"];

/**
 * Default return URL after successful auth.
 */
export const DEFAULT_RETURN_TO = "/arbor";

/**
 * Default GroveAuth URLs.
 *
 * With Better Auth migration:
 * - OAuth flows redirect directly to Better Auth's /api/auth/sign-in/social
 * - No more intermediate PKCE dance - Better Auth handles everything
 * - Session cookie (better-auth.session_token) is set by Better Auth
 *
 * For local development with Cloudflare Tunnel, set VITE_AUTH_API_URL
 * in .env.local to override the production auth API base URL.
 * @example VITE_AUTH_API_URL=https://dev.grove.place
 */
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_URL ?? AUTH_HUB_URL;

export const GROVEAUTH_URLS = {
  /** Frontend login page (legacy - kept for reference) */
  auth: "https://auth.grove.place",
  /** Better Auth API endpoint for social sign-in */
  api: AUTH_API_BASE,
  /** Better Auth social sign-in endpoint (direct redirect) */
  socialSignIn: `${AUTH_API_BASE}/api/auth/sign-in/social`,
  /** Better Auth magic link sign-in endpoint */
  magicLink: `${AUTH_API_BASE}/api/auth/sign-in/magic-link`,
} as const;

/**
 * Default login endpoint URL.
 * @deprecated Use GROVEAUTH_URLS.socialSignIn for Better Auth direct redirect
 */
export const DEFAULT_LOGIN_URL = "/auth/login";

/**
 * Unified login hub URL.
 * All auth flows (sign-in, passkey creation) go through this origin.
 * Overridable via VITE_LOGIN_URL for local development.
 */
export const LOGIN_URL =
  import.meta.env.VITE_LOGIN_URL ?? "https://login.grove.place";

/**
 * Build a URL to the login hub with a redirect parameter.
 * After auth completes, the user will be sent back to `redirectTo`.
 */
export function buildLoginUrl(redirectTo: string): string {
  return `${LOGIN_URL}?redirect=${encodeURIComponent(redirectTo)}`;
}

/**
 * Build a URL to the passkey registration page on the login hub.
 */
export function buildPasskeyUrl(redirectTo: string): string {
  return `${LOGIN_URL}/passkey?redirect=${encodeURIComponent(redirectTo)}`;
}

/**
 * Cookie names used in OAuth flow.
 *
 * With Better Auth migration:
 * - Legacy cookies (state, codeVerifier, accessToken, refreshToken) are no longer used
 * - Better Auth sets 'better-auth.session_token' directly
 * - We still use returnTo to know where to redirect after auth
 */
export const AUTH_COOKIE_NAMES = {
  /** CSRF state @deprecated - Better Auth handles CSRF internally */
  state: "auth_state",
  /** PKCE code verifier @deprecated - Better Auth handles PKCE internally */
  codeVerifier: "auth_code_verifier",
  /** Return URL after auth */
  returnTo: "auth_return_to",
  /** Access token @deprecated - Better Auth uses session tokens */
  accessToken: "access_token",
  /** Refresh token @deprecated - Better Auth handles refresh internally */
  refreshToken: "refresh_token",
  /** Session ID (legacy) @deprecated */
  session: "session",
  /** Better Auth session token (the new standard) - unprefixed for dev */
  betterAuthSession: "better-auth.session_token",
  /** Better Auth session token with __Secure- prefix (production HTTPS) */
  betterAuthSessionSecure: "__Secure-better-auth.session_token",
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
