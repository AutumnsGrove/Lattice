/**
 * Login Graft Configuration
 *
 * Provider registry and default configuration for the LoginGraft.
 * Google OAuth is the sole authentication method.
 */

import type { AuthProvider, ProviderConfig } from "./types.js";
import { AUTH_HUB_URL } from "../../platform/config/auth.js";
import { readViteEnv } from "../../utils/vite-env.js";

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
	return (Object.keys(PROVIDERS) as AuthProvider[]).filter((id) => PROVIDERS[id].available);
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default providers to show if none specified.
 */
export const DEFAULT_PROVIDERS: AuthProvider[] = ["google"];

/**
 * Default return URL after successful auth.
 */
export const DEFAULT_RETURN_TO = "/arbor";

/**
 * Heartwood API URLs.
 *
 * AUTH ARCHITECTURE: All auth flows go through login.grove.place.
 * Engine tenant sites (*.grove.place) redirect to login.grove.place
 * via buildLoginUrl() — they do NOT make cross-origin API calls.
 * These URLs are used by the login hub itself (same-origin) and by
 * service binding calls (where the host is cosmetic).
 *
 * For local development with Cloudflare Tunnel, set VITE_AUTH_API_URL
 * in .env.local to override the production auth API base URL.
 * @example VITE_AUTH_API_URL=https://dev.grove.place
 */
const AUTH_API_BASE = readViteEnv("VITE_AUTH_API_URL") ?? AUTH_HUB_URL;

export const GROVEAUTH_URLS = {
	/** Frontend login page (legacy - kept for reference) */
	auth: "https://auth.grove.place",
	/** Better Auth API endpoint for social sign-in */
	api: AUTH_API_BASE,
	/** Better Auth social sign-in endpoint (direct redirect) */
	socialSignIn: `${AUTH_API_BASE}/api/auth/sign-in/social`,
} as const;

/**
 * Default login endpoint URL.
 * @deprecated Use GROVEAUTH_URLS.socialSignIn for Better Auth direct redirect
 */
export const DEFAULT_LOGIN_URL = "/auth/login";

/**
 * Unified login hub URL.
 * All auth flows go through this origin.
 * Overridable via VITE_LOGIN_URL for local development.
 */
export const LOGIN_URL = readViteEnv("VITE_LOGIN_URL") ?? "https://login.grove.place";

/**
 * Build a URL to the login hub with a redirect parameter.
 * After auth completes, the user will be sent back to `redirectTo`.
 */
export function buildLoginUrl(redirectTo: string): string {
	return `${LOGIN_URL}?redirect=${encodeURIComponent(redirectTo)}`;
}

/**
 * Cookie names used in auth flow.
 *
 * Better Auth sets session cookies directly. We only track:
 * - returnTo: where to redirect after auth completes
 * - betterAuthSession / betterAuthSessionSecure: session cookie names
 */
export const AUTH_COOKIE_NAMES = {
	/** Return URL after auth */
	returnTo: "auth_return_to",
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
 */
export const AUTH_COOKIE_OPTIONS = {
	/** Options for temporary auth flow cookies (state, verifier, returnTo) */
	temporary: {
		path: "/",
		httpOnly: true,
		sameSite: "lax" as const,
		maxAge: 60 * 10, // 10 minutes
	},
	/** Options for session cookies */
	session: {
		path: "/",
		httpOnly: true,
		sameSite: "lax" as const,
		maxAge: 60 * 60 * 24 * 30, // 30 days
	},
} as const;
