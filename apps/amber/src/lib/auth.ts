/**
 * Better Auth integration
 * Handles authentication with Better Auth session-based auth
 */

const AUTH_BASE_URL = "https://login.grove.place";

export interface User {
	id: string;
	email: string;
	name?: string;
}

export interface Session {
	user: User;
	session: {
		id: string;
		expiresAt: string;
	};
}

/**
 * Start OAuth sign-in flow
 * Redirects to Better Auth OAuth provider
 */
export function signIn(provider: "google" | "github" = "google"): void {
	const redirectUrl = encodeURIComponent(window.location.href);
	window.location.href = `${AUTH_BASE_URL}/api/auth/sign-in/${provider}?callbackURL=${redirectUrl}`;
}

/**
 * Get current session
 * Returns user and session data if authenticated, null otherwise
 */
export async function getSession(): Promise<Session | null> {
	try {
		const response = await fetch(`${AUTH_BASE_URL}/api/auth/session`, {
			credentials: "include", // Required for cross-origin cookies
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data as Session;
	} catch (err) {
		console.error("Failed to get session:", err);
		return null;
	}
}

/**
 * Sign out current user
 * Clears session and redirects to home
 */
export async function signOut(): Promise<void> {
	try {
		await fetch(`${AUTH_BASE_URL}/api/auth/sign-out`, {
			method: "POST",
			credentials: "include",
		});

		// Redirect to home page after sign out
		window.location.href = "/";
	} catch (err) {
		console.error("Failed to sign out:", err);
		// Still redirect even if sign out fails
		window.location.href = "/";
	}
}
