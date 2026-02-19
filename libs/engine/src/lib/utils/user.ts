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
  if (!user) return "Wanderer";
  return user.name || user.email?.split("@")[0] || "Wanderer";
}

/**
 * Check if we have a personalized name for the user.
 * Use this to decide between "Welcome, Wanderer" vs "Welcome back, {name}"
 */
export function hasPersonalizedName(user?: UserLike | null): boolean {
  if (!user) return false;
  return Boolean(user.name || user.email);
}

/**
 * Normalize an email address for consistent comparison.
 * Applies lowercase and trims whitespace.
 *
 * @example
 * ```ts
 * normalizeEmail('  User@Example.COM  ') // 'user@example.com'
 * normalizeEmail(null) // null
 * ```
 */
export function normalizeEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return normalized || null;
}

/**
 * Compare two email addresses for equality (case-insensitive, whitespace-tolerant).
 * Returns false if either email is null/undefined.
 *
 * @example
 * ```ts
 * emailsMatch('user@example.com', 'USER@example.com') // true
 * emailsMatch('user@example.com', null) // false
 * ```
 */
export function emailsMatch(
  email1: string | null | undefined,
  email2: string | null | undefined,
): boolean {
  const normalized1 = normalizeEmail(email1);
  const normalized2 = normalizeEmail(email2);
  if (!normalized1 || !normalized2) return false;
  return normalized1 === normalized2;
}
