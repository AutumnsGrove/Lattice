/**
 * User display utilities
 *
 * Grove User Identity: Wanderer → Rooted → Pathfinder → Wayfinder
 * See docs/grove-user-identity.md for full documentation
 */

export interface UserLike {
	name?: string | null;
	email?: string | null;
}

/**
 * Get a display name for greeting a user.
 *
 * Priority:
 * 1. User's name (if set)
 * 2. Email username (part before @)
 * 3. "Wanderer" (Grove's default for anonymous/unknown)
 *
 * @example
 * ```ts
 * // In authenticated dashboard
 * const greeting = getUserDisplayName(data.user);
 * // Returns "Jordan" or "jordan" or "Wanderer"
 * ```
 */
export function getUserDisplayName(user?: UserLike | null): string {
	if (!user) return 'Wanderer';
	return user.name || user.email?.split('@')[0] || 'Wanderer';
}

/**
 * Check if we have a personalized name for the user.
 * Use this to decide between "Welcome, Wanderer" vs "Welcome back, {name}"
 */
export function hasPersonalizedName(user?: UserLike | null): boolean {
	if (!user) return false;
	return Boolean(user.name || user.email);
}
