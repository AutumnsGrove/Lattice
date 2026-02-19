/**
 * User Service - User management and authentication helpers
 */

import type { User, AuthProvider, D1DatabaseOrSession } from "../types.js";
import {
  getUserByEmail,
  getOrCreateUser,
  isEmailAllowed,
  createAuditLog,
} from "../db/queries.js";

/**
 * Authenticate a user after OAuth or magic code verification
 * Returns the user if email is allowed, null otherwise
 *
 * @param db - Database connection
 * @param data - User data from OAuth provider or magic code
 * @param context - Request context including client_id and optional publicSignupEnabled flag
 */
export async function authenticateUser(
  db: D1DatabaseOrSession,
  data: {
    email: string;
    name: string | null;
    avatar_url: string | null;
    provider: AuthProvider;
    provider_id: string | null;
  },
  context: {
    client_id: string;
    ip_address?: string;
    user_agent?: string;
    publicSignupEnabled?: boolean;
  },
): Promise<User | null> {
  // Check if email is allowed (respects public signup flag)
  const allowed = await isEmailAllowed(
    db,
    data.email,
    context.publicSignupEnabled,
  );

  if (!allowed) {
    // Log failed attempt
    await createAuditLog(db, {
      event_type: "failed_login",
      client_id: context.client_id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      details: {
        reason: "email_not_allowed",
        email: data.email,
        provider: data.provider,
      },
    });
    return null;
  }

  // Get or create user
  const user = await getOrCreateUser(db, data);

  // Log successful login
  await createAuditLog(db, {
    event_type: "login",
    user_id: user.id,
    client_id: context.client_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      provider: data.provider,
    },
  });

  return user;
}

/**
 * Get user by email (for token verification etc.)
 */
export async function getUserForEmail(
  db: D1DatabaseOrSession,
  email: string,
): Promise<User | null> {
  return getUserByEmail(db, email);
}

/**
 * Log a logout event
 */
export async function logLogout(
  db: D1DatabaseOrSession,
  userId: string,
  context: {
    client_id?: string;
    ip_address?: string;
    user_agent?: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    event_type: "logout",
    user_id: userId,
    client_id: context.client_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
  });
}

/**
 * Log a token exchange event
 */
export async function logTokenExchange(
  db: D1DatabaseOrSession,
  userId: string,
  context: {
    client_id: string;
    ip_address?: string;
    user_agent?: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    event_type: "token_exchange",
    user_id: userId,
    client_id: context.client_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
  });
}

/**
 * Log a token refresh event
 */
export async function logTokenRefresh(
  db: D1DatabaseOrSession,
  userId: string,
  context: {
    client_id: string;
    ip_address?: string;
    user_agent?: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    event_type: "token_refresh",
    user_id: userId,
    client_id: context.client_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
  });
}

/**
 * Log a token revocation event
 */
export async function logTokenRevoke(
  db: D1DatabaseOrSession,
  userId: string,
  context: {
    client_id?: string;
    ip_address?: string;
    user_agent?: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    event_type: "token_revoke",
    user_id: userId,
    client_id: context.client_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
  });
}
