/**
 * User Service - D1 User Operations
 *
 * Provides utilities for managing authenticated users in D1.
 * Users are created/updated during auth callback from GroveAuth.
 *
 * @example
 * ```typescript
 * import { getUserByGroveAuthId, getUserFromSession } from '@autumnsgrove/groveengine/services';
 *
 * // Get user by GroveAuth ID (from token)
 * const user = await getUserByGroveAuthId(db, groveAuthId);
 *
 * // Get user from session (validates token first)
 * const user = await getUserFromSession(db, accessToken, authBaseUrl);
 * ```
 */

import { queryOne, update } from "./database.js";
import { AUTH_HUB_URL } from "../../config/auth.js";

// ============================================================================
// Types
// ============================================================================

/**
 * User record from the users table
 */
export interface User {
  id: string;
  groveauth_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
  last_login_at: number | null;
  login_count: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/**
 * User info from GroveAuth /userinfo endpoint
 */
interface GroveAuthUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get a user by their GroveAuth ID
 *
 * @example
 * ```typescript
 * const user = await getUserByGroveAuthId(db, 'groveauth-user-id');
 * if (user) {
 *   console.log('User:', user.id);
 * }
 * ```
 */
export async function getUserByGroveAuthId(
  db: D1Database,
  groveAuthId: string,
): Promise<User | null> {
  return queryOne<User>(db, "SELECT * FROM users WHERE groveauth_id = ?", [
    groveAuthId,
  ]);
}

/**
 * Get a user by their internal ID
 */
export async function getUserById(
  db: D1Database,
  id: string,
): Promise<User | null> {
  return queryOne<User>(db, "SELECT * FROM users WHERE id = ?", [id]);
}

/**
 * Get a user by email address
 */
export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  return queryOne<User>(db, "SELECT * FROM users WHERE email = ?", [email]);
}

/**
 * Get user who owns a specific tenant
 */
export async function getUserByTenantId(
  db: D1Database,
  tenantId: string,
): Promise<User | null> {
  return queryOne<User>(db, "SELECT * FROM users WHERE tenant_id = ?", [
    tenantId,
  ]);
}

// ============================================================================
// Session Functions
// ============================================================================

/**
 * Get user from an access token by validating with GroveAuth
 *
 * This function:
 * 1. Calls GroveAuth /userinfo to validate the token and get user info
 * 2. Looks up the user in D1 by their groveauth_id
 * 3. Returns the user if found and active
 *
 * @example
 * ```typescript
 * const user = await getUserFromSession(db, accessToken, 'https://auth-api.grove.place');
 * if (!user) {
 *   return redirect(302, '/auth/login');
 * }
 * ```
 */
export async function getUserFromSession(
  db: D1Database,
  accessToken: string,
  authBaseUrl: string = AUTH_HUB_URL,
): Promise<User | null> {
  if (!accessToken) {
    return null;
  }

  try {
    // Validate token with GroveAuth and get user info
    const response = await fetch(`${authBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // Don't log 401s as errors - they're expected for expired tokens
      if (response.status !== 401) {
        console.warn("[User Service] GroveAuth returned non-OK status:", {
          status: response.status,
          authBaseUrl,
        });
      }
      return null;
    }

    const userInfo = (await response.json()) as GroveAuthUserInfo;

    // Look up user in D1
    const user = await getUserByGroveAuthId(db, userInfo.sub);

    // Return null if user doesn't exist or is inactive
    if (!user || !user.is_active) {
      return null;
    }

    return user;
  } catch (error) {
    // Log auth failures for security monitoring and debugging
    console.error("[User Service] Session validation failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      authBaseUrl,
    });
    return null;
  }
}

/**
 * Get user from session without external validation
 *
 * Use this when you've already validated the token (e.g., in hooks.server.ts)
 * and have the GroveAuth user ID (sub claim).
 *
 * @example
 * ```typescript
 * // In hooks.server.ts after token validation:
 * const user = await getUserFromValidatedSession(db, tokenInfo.sub);
 * event.locals.user = user;
 * ```
 */
export async function getUserFromValidatedSession(
  db: D1Database,
  groveAuthId: string,
): Promise<User | null> {
  const user = await getUserByGroveAuthId(db, groveAuthId);

  if (!user || !user.is_active) {
    return null;
  }

  return user;
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Link a user to a tenant (set ownership)
 */
export async function linkUserToTenant(
  db: D1Database,
  userId: string,
  tenantId: string,
): Promise<number> {
  return update(db, "users", { tenant_id: tenantId }, "id = ?", [userId]);
}

/**
 * Update user's display name
 */
export async function updateUserDisplayName(
  db: D1Database,
  userId: string,
  displayName: string,
): Promise<number> {
  return update(db, "users", { display_name: displayName }, "id = ?", [userId]);
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(
  db: D1Database,
  userId: string,
): Promise<number> {
  return update(db, "users", { is_active: 0 }, "id = ?", [userId]);
}

/**
 * Reactivate a user
 */
export async function reactivateUser(
  db: D1Database,
  userId: string,
): Promise<number> {
  return update(db, "users", { is_active: 1 }, "id = ?", [userId]);
}
