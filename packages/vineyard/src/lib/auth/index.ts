/**
 * Better Auth Integration Utilities
 * Client-side functions for Better Auth session management
 */

import type {
  BetterAuthSessionResponse,
  BetterAuthProvider,
} from "../types/index.js";

/** Better Auth API base URL — canonical source: @autumnsgrove/groveengine/config AUTH_HUB_URL */
const BETTER_AUTH_BASE_URL = "https://login.grove.place";

/**
 * Start OAuth sign in flow
 * Redirects to Better Auth OAuth provider
 *
 * @param provider - OAuth provider ('google' or 'github')
 * @param callbackURL - Optional callback URL (defaults to current page)
 *
 * @throws Error if provider is invalid or called outside browser
 *
 * @example
 * ```typescript
 * import { signIn } from '@autumnsgrove/vineyard/auth';
 *
 * // Sign in with Google
 * signIn('google');
 *
 * // Sign in with custom callback
 * signIn('github', 'https://myapp.grove.place/dashboard');
 * ```
 */
export function signIn(
  provider: BetterAuthProvider = "google",
  callbackURL?: string,
): void {
  if (typeof window === "undefined") {
    throw new Error("signIn can only be called in the browser");
  }

  // Validate provider at runtime (defense in depth)
  const validProviders: BetterAuthProvider[] = ["google", "github"];
  if (!validProviders.includes(provider)) {
    throw new Error(
      `Invalid provider: ${provider}. Must be one of: ${validProviders.join(", ")}`,
    );
  }

  const redirectUrl = callbackURL || window.location.href;
  const encodedRedirect = encodeURIComponent(redirectUrl);
  const authUrl = `${BETTER_AUTH_BASE_URL}/api/auth/sign-in/${provider}?callbackURL=${encodedRedirect}`;

  window.location.href = authUrl;
}

/**
 * Get current session from Better Auth
 * Returns user and session data if authenticated
 *
 * @returns Promise resolving to session response with user and session data
 *
 * @example
 * ```typescript
 * import { getSession } from '@autumnsgrove/vineyard/auth';
 *
 * const sessionData = await getSession();
 * if (sessionData.user) {
 *   console.log('Logged in as:', sessionData.user.name);
 * } else {
 *   console.log('Not authenticated');
 * }
 * ```
 */
export async function getSession(): Promise<BetterAuthSessionResponse> {
  try {
    const response = await fetch(`${BETTER_AUTH_BASE_URL}/api/auth/session`, {
      credentials: "include", // Required for cross-origin cookies
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { user: null, session: null };
    }

    const data = await response.json();
    return data as BetterAuthSessionResponse;
  } catch (error) {
    console.warn(
      "[Vineyard Auth] Session fetch failed:",
      (error as Error)?.message,
    );
    return { user: null, session: null };
  }
}

/**
 * Sign out current user
 * Ends the Better Auth session and optionally redirects
 *
 * @param redirectTo - Optional URL to redirect to after sign out (defaults to '/')
 *
 * @example
 * ```typescript
 * import { signOut } from '@autumnsgrove/vineyard/auth';
 *
 * // Sign out and redirect to home
 * await signOut();
 *
 * // Sign out and redirect to login page
 * await signOut('/login');
 * ```
 */
export async function signOut(redirectTo: string = "/"): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("signOut can only be called in the browser");
  }

  try {
    await fetch(`${BETTER_AUTH_BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include", // Required for cross-origin cookies
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    console.warn(
      "[Vineyard Auth] Sign-out failed (redirecting anyway):",
      (error as Error)?.message,
    );
  }

  // Redirect regardless of fetch result
  window.location.href = redirectTo;
}

/**
 * Check if user is authenticated
 * Convenience function that checks for active session
 *
 * @returns Promise resolving to true if authenticated, false otherwise
 *
 * @example
 * ```typescript
 * import { isAuthenticated } from '@autumnsgrove/vineyard/auth';
 *
 * if (await isAuthenticated()) {
 *   // Show authenticated content
 * } else {
 *   // Show login prompt
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getSession();
  return user !== null;
}
