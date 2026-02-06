/**
 * Database query functions
 */

import type {
  Client,
  User,
  AllowedEmail,
  AuthCode,
  RefreshToken,
  MagicCode,
  RateLimit,
  FailedAttempt,
  AuditEventType,
  AuditLog,
  OAuthState,
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionAuditEventType,
  UserSession,
  UserClientPreference,
  AdminStats,
  D1DatabaseOrSession,
  DeviceCode,
} from "../types.js";
import { TIER_POST_LIMITS, ADMIN_EMAILS } from "../types.js";
import { generateUUID } from "../utils/crypto.js";

// ==================== Wildcard Redirect URI Configuration ====================

/**
 * Wildcard configuration for multi-tenant clients.
 * Maps client_id to pattern config for dynamic redirect URI validation.
 */
const WILDCARD_CLIENTS: Record<
  string,
  { pattern: RegExp; baseDomain: string }
> = {
  groveengine: {
    // Matches https://{subdomain}.grove.place/auth/callback
    // Subdomain must be alphanumeric with hyphens only (no dots/nested subdomains)
    pattern: /^https:\/\/([a-z0-9-]+)\.grove\.place\/auth\/callback$/i,
    baseDomain: "grove.place",
  },
};

/**
 * Extract subdomain from redirect URI matching a wildcard pattern.
 * Returns null if the client doesn't support wildcards or URI doesn't match pattern.
 */
export function extractSubdomainFromRedirectUri(
  clientId: string,
  redirectUri: string,
): string | null {
  const config = WILDCARD_CLIENTS[clientId];
  if (!config) return null;

  const match = redirectUri.match(config.pattern);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if a subdomain exists as an active tenant in GroveEngine.
 * This prevents redirect hijacking to non-existent or suspended tenants.
 */
export async function isActiveTenant(
  engineDb: D1Database,
  subdomain: string,
): Promise<boolean> {
  const result = await engineDb
    .prepare("SELECT 1 FROM tenants WHERE subdomain = ? AND active = 1")
    .bind(subdomain.toLowerCase())
    .first<{ 1: number }>();
  return result !== null;
}

// ==================== Clients ====================

export async function getClientByClientId(
  db: D1DatabaseOrSession,
  clientId: string,
): Promise<Client | null> {
  const result = await db
    .prepare("SELECT * FROM clients WHERE client_id = ?")
    .bind(clientId)
    .first<Client>();
  return result;
}

/**
 * Validate a redirect URI against an already-fetched client.
 * Use this when you already have the client object to avoid redundant DB queries.
 *
 * @param client - The client object
 * @param redirectUri - The redirect URI to validate
 * @param engineDb - Optional GroveEngine database for wildcard tenant validation
 */
export async function validateRedirectUriForClient(
  client: Client,
  redirectUri: string,
  engineDb?: D1Database,
): Promise<boolean> {
  // First, check exact match (backward compatible)
  const allowedUris: string[] = JSON.parse(client.redirect_uris);
  if (allowedUris.includes(redirectUri)) {
    return true;
  }

  // Check if this client supports wildcard validation
  const subdomain = extractSubdomainFromRedirectUri(
    client.client_id,
    redirectUri,
  );
  if (subdomain && engineDb) {
    return isActiveTenant(engineDb, subdomain);
  }

  return false;
}

/**
 * Validate that a redirect URI is allowed for a client.
 *
 * Validation order:
 * 1. Exact match against registered redirect_uris (backward compatible)
 * 2. For supported clients (e.g., groveengine): wildcard subdomain validation
 *    - Extract subdomain from URI pattern (e.g., autumn.grove.place)
 *    - Verify subdomain exists as active tenant in GroveEngine DB
 *
 * @param db - Heartwood database connection
 * @param clientId - The OAuth client ID
 * @param redirectUri - The redirect URI to validate
 * @param engineDb - Optional GroveEngine database for wildcard tenant validation
 */
export async function validateClientRedirectUri(
  db: D1DatabaseOrSession,
  clientId: string,
  redirectUri: string,
  engineDb?: D1Database,
): Promise<boolean> {
  const client = await getClientByClientId(db, clientId);
  if (!client) return false;

  return validateRedirectUriForClient(client, redirectUri, engineDb);
}

export async function validateClientOrigin(
  db: D1DatabaseOrSession,
  clientId: string,
  origin: string,
): Promise<boolean> {
  const client = await getClientByClientId(db, clientId);
  if (!client) return false;

  const allowedOrigins: string[] = JSON.parse(client.allowed_origins);
  return allowedOrigins.includes(origin);
}

// ==================== Users ====================

export async function getUserById(
  db: D1DatabaseOrSession,
  id: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();
  return result;
}

export async function getUserByEmail(
  db: D1DatabaseOrSession,
  email: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<User>();
  return result;
}

export async function createUser(
  db: D1DatabaseOrSession,
  data: {
    email: string;
    name: string | null;
    avatar_url: string | null;
    provider: string;
    provider_id: string | null;
  },
): Promise<User> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar_url, provider, provider_id, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.email.toLowerCase(),
      data.name,
      data.avatar_url,
      data.provider,
      data.provider_id,
      now,
      now,
    )
    .run();

  return (await getUserById(db, id))!;
}

export async function updateUserLogin(
  db: D1DatabaseOrSession,
  id: string,
  data: { name?: string | null; avatar_url?: string | null },
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), last_login = ? WHERE id = ?`,
    )
    .bind(data.name, data.avatar_url, now, id)
    .run();
}

export async function getOrCreateUser(
  db: D1DatabaseOrSession,
  data: {
    email: string;
    name: string | null;
    avatar_url: string | null;
    provider: string;
    provider_id: string | null;
  },
): Promise<User> {
  const existing = await getUserByEmail(db, data.email);

  if (existing) {
    await updateUserLogin(db, existing.id, {
      name: data.name,
      avatar_url: data.avatar_url,
    });
    return (await getUserById(db, existing.id))!;
  }

  return createUser(db, data);
}

// ==================== Allowed Emails ====================

/**
 * Check if an email is allowed to sign up/login.
 *
 * @param db - Database connection
 * @param email - Email to check
 * @param publicSignupEnabled - If true, bypasses allowlist check (all emails allowed)
 * @returns true if email is allowed, false otherwise
 */
export async function isEmailAllowed(
  db: D1DatabaseOrSession,
  email: string,
  publicSignupEnabled?: boolean,
): Promise<boolean> {
  // If public signup is enabled, all emails are allowed
  if (publicSignupEnabled) {
    return true;
  }

  // Check against allowlist
  const result = await db
    .prepare("SELECT email FROM allowed_emails WHERE email = ?")
    .bind(email.toLowerCase())
    .first<AllowedEmail>();
  return result !== null;
}

// ==================== Auth Codes ====================

export async function createAuthCode(
  db: D1DatabaseOrSession,
  data: {
    code: string;
    client_id: string;
    user_id: string;
    redirect_uri: string;
    code_challenge?: string;
    code_challenge_method?: string;
    expires_at: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO auth_codes (code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.code,
      data.client_id,
      data.user_id,
      data.redirect_uri,
      data.code_challenge || null,
      data.code_challenge_method || null,
      data.expires_at,
    )
    .run();
}

export async function getAuthCode(
  db: D1DatabaseOrSession,
  code: string,
): Promise<AuthCode | null> {
  const result = await db
    .prepare("SELECT * FROM auth_codes WHERE code = ?")
    .bind(code)
    .first<AuthCode>();
  return result;
}

export async function markAuthCodeUsed(
  db: D1DatabaseOrSession,
  code: string,
): Promise<void> {
  await db
    .prepare("UPDATE auth_codes SET used = 1 WHERE code = ?")
    .bind(code)
    .run();
}

/**
 * Atomically consume an auth code - validates and marks as used in a single operation.
 * This prevents race conditions where two concurrent requests could both pass validation
 * before either marks the code as used.
 *
 * @param db - Database connection
 * @param code - The authorization code to consume
 * @param clientId - Expected client_id for validation
 * @returns The auth code if valid and successfully consumed, null otherwise
 */
export async function consumeAuthCode(
  db: D1DatabaseOrSession,
  code: string,
  clientId: string,
): Promise<AuthCode | null> {
  const now = new Date().toISOString();

  // Use UPDATE...RETURNING to atomically validate and mark the code as used
  // This ensures only one request can successfully consume a given auth code
  const result = await db
    .prepare(
      `UPDATE auth_codes
       SET used = 1
       WHERE code = ?
         AND used = 0
         AND expires_at > ?
         AND client_id = ?
       RETURNING *`,
    )
    .bind(code, now, clientId)
    .first<AuthCode>();

  return result;
}

export async function cleanupExpiredAuthCodes(
  db: D1DatabaseOrSession,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("DELETE FROM auth_codes WHERE expires_at < ? OR used = 1")
    .bind(now)
    .run();
}

// ==================== Refresh Tokens ====================

export async function createRefreshToken(
  db: D1DatabaseOrSession,
  data: {
    token_hash: string;
    user_id: string;
    client_id: string;
    expires_at: string;
  },
): Promise<string> {
  const id = generateUUID();

  await db
    .prepare(
      `INSERT INTO refresh_tokens (id, token_hash, user_id, client_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, data.token_hash, data.user_id, data.client_id, data.expires_at)
    .run();

  return id;
}

export async function getRefreshTokenByHash(
  db: D1DatabaseOrSession,
  tokenHash: string,
): Promise<RefreshToken | null> {
  const result = await db
    .prepare(
      "SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0",
    )
    .bind(tokenHash)
    .first<RefreshToken>();
  return result;
}

export async function revokeRefreshToken(
  db: D1DatabaseOrSession,
  tokenHash: string,
): Promise<void> {
  await db
    .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

export async function revokeAllUserTokens(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<void> {
  await db
    .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?")
    .bind(userId)
    .run();
}

export async function cleanupExpiredRefreshTokens(
  db: D1DatabaseOrSession,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1")
    .bind(now)
    .run();
}

// ==================== Magic Codes ====================

export async function createMagicCode(
  db: D1DatabaseOrSession,
  data: {
    email: string;
    code: string;
    expires_at: string;
  },
): Promise<void> {
  const id = generateUUID();

  await db
    .prepare(
      "INSERT INTO magic_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(id, data.email.toLowerCase(), data.code, data.expires_at)
    .run();
}

export async function getMagicCode(
  db: D1DatabaseOrSession,
  email: string,
  code: string,
): Promise<MagicCode | null> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      "SELECT * FROM magic_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?",
    )
    .bind(email.toLowerCase(), code, now)
    .first<MagicCode>();
  return result;
}

export async function markMagicCodeUsed(
  db: D1DatabaseOrSession,
  id: string,
): Promise<void> {
  await db
    .prepare("UPDATE magic_codes SET used = 1 WHERE id = ?")
    .bind(id)
    .run();
}

export async function cleanupExpiredMagicCodes(
  db: D1DatabaseOrSession,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("DELETE FROM magic_codes WHERE expires_at < ? OR used = 1")
    .bind(now)
    .run();
}

// ==================== Rate Limiting ====================

export async function checkRateLimit(
  db: D1DatabaseOrSession,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - windowSeconds * 1000,
  ).toISOString();

  const existing = await db
    .prepare("SELECT * FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<RateLimit>();

  if (!existing || existing.window_start < windowStart) {
    // Reset or create new window
    await db
      .prepare(
        `INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)`,
      )
      .bind(key, now.toISOString())
      .run();

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowSeconds * 1000),
    };
  }

  if (existing.count >= limit) {
    const resetAt = new Date(
      new Date(existing.window_start).getTime() + windowSeconds * 1000,
    );
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  await db
    .prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?")
    .bind(key)
    .run();

  return {
    allowed: true,
    remaining: limit - existing.count - 1,
    resetAt: new Date(
      new Date(existing.window_start).getTime() + windowSeconds * 1000,
    ),
  };
}

// ==================== Failed Attempts ====================

export async function recordFailedAttempt(
  db: D1DatabaseOrSession,
  email: string,
  maxAttempts: number,
  lockoutSeconds: number,
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const now = new Date();
  const existing = await db
    .prepare("SELECT * FROM failed_attempts WHERE email = ?")
    .bind(email.toLowerCase())
    .first<FailedAttempt>();

  if (existing?.locked_until && new Date(existing.locked_until) > now) {
    return { locked: true, lockedUntil: new Date(existing.locked_until) };
  }

  const newAttempts = (existing?.attempts || 0) + 1;

  if (newAttempts >= maxAttempts) {
    const lockedUntil = new Date(now.getTime() + lockoutSeconds * 1000);
    await db
      .prepare(
        `INSERT OR REPLACE INTO failed_attempts (email, attempts, last_attempt, locked_until)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(
        email.toLowerCase(),
        newAttempts,
        now.toISOString(),
        lockedUntil.toISOString(),
      )
      .run();
    return { locked: true, lockedUntil };
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO failed_attempts (email, attempts, last_attempt, locked_until)
       VALUES (?, ?, ?, NULL)`,
    )
    .bind(email.toLowerCase(), newAttempts, now.toISOString())
    .run();

  return { locked: false, lockedUntil: null };
}

export async function clearFailedAttempts(
  db: D1DatabaseOrSession,
  email: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM failed_attempts WHERE email = ?")
    .bind(email.toLowerCase())
    .run();
}

export async function isAccountLocked(
  db: D1DatabaseOrSession,
  email: string,
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const now = new Date();
  const existing = await db
    .prepare("SELECT * FROM failed_attempts WHERE email = ?")
    .bind(email.toLowerCase())
    .first<FailedAttempt>();

  if (existing?.locked_until && new Date(existing.locked_until) > now) {
    return { locked: true, lockedUntil: new Date(existing.locked_until) };
  }

  return { locked: false, lockedUntil: null };
}

// ==================== Audit Log ====================

export async function createAuditLog(
  db: D1DatabaseOrSession,
  data: {
    event_type: AuditEventType;
    user_id?: string;
    client_id?: string;
    ip_address?: string;
    user_agent?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const id = generateUUID();

  await db
    .prepare(
      `INSERT INTO audit_log (id, event_type, user_id, client_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.event_type,
      data.user_id || null,
      data.client_id || null,
      data.ip_address || null,
      data.user_agent || null,
      data.details ? JSON.stringify(data.details) : null,
    )
    .run();
}

// Minimum audit log retention to prevent accidental deletion
const MIN_AUDIT_RETENTION_DAYS = 30;

/**
 * Clean up old audit logs beyond the retention period.
 * Default retention: 90 days (configurable).
 *
 * This prevents unbounded growth of the audit_log table.
 * Should be called periodically (e.g., via scheduled worker).
 *
 * @param db - Database connection
 * @param retentionDays - Number of days to retain logs (default: 90, minimum: 30)
 * @returns Number of deleted rows
 * @throws Error if retentionDays is below minimum (prevents accidental deletion)
 */
export async function cleanupOldAuditLogs(
  db: D1DatabaseOrSession,
  retentionDays: number = 90,
): Promise<number> {
  // Validate minimum retention to prevent accidental mass deletion
  if (retentionDays < MIN_AUDIT_RETENTION_DAYS) {
    throw new Error(
      `Audit log retention must be at least ${MIN_AUDIT_RETENTION_DAYS} days (got ${retentionDays})`,
    );
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  const result = await db
    .prepare("DELETE FROM audit_log WHERE created_at < ?")
    .bind(cutoffIso)
    .run();

  return result.meta?.changes ?? 0;
}

// ==================== OAuth State ====================

export async function saveOAuthState(
  db: D1DatabaseOrSession,
  data: {
    state: string;
    client_id: string;
    redirect_uri: string;
    code_challenge?: string;
    code_challenge_method?: string;
    original_state: string;
    expires_at: string;
    is_internal_service?: boolean; // Cached from client to avoid re-fetch in callback
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO oauth_states (state, client_id, redirect_uri, code_challenge, code_challenge_method, original_state, expires_at, is_internal_service)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.state,
      data.client_id,
      data.redirect_uri,
      data.code_challenge || null,
      data.code_challenge_method || null,
      data.original_state,
      data.expires_at,
      data.is_internal_service ? 1 : 0,
    )
    .run();
}

export async function getOAuthState(
  db: D1DatabaseOrSession,
  state: string,
): Promise<OAuthState | null> {
  const now = new Date().toISOString();
  const result = await db
    .prepare("SELECT * FROM oauth_states WHERE state = ? AND expires_at > ?")
    .bind(state, now)
    .first<OAuthState & { original_state: string }>();

  if (!result) return null;

  return {
    client_id: result.client_id,
    redirect_uri: result.redirect_uri,
    state: result.original_state,
    code_challenge: result.code_challenge || undefined,
    code_challenge_method: result.code_challenge_method || undefined,
    is_internal_service: Boolean(
      (result as { is_internal_service?: number }).is_internal_service,
    ),
  };
}

export async function deleteOAuthState(
  db: D1DatabaseOrSession,
  state: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM oauth_states WHERE state = ?")
    .bind(state)
    .run();
}

export async function cleanupExpiredOAuthStates(
  db: D1DatabaseOrSession,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("DELETE FROM oauth_states WHERE expires_at < ?")
    .bind(now)
    .run();
}

// ==================== User Subscriptions ====================

export async function getUserSubscription(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<UserSubscription | null> {
  return db
    .prepare("SELECT * FROM user_subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<UserSubscription>();
}

export async function createUserSubscription(
  db: D1DatabaseOrSession,
  userId: string,
  tier: SubscriptionTier = "seedling",
): Promise<UserSubscription> {
  const id = generateUUID();
  const postLimit = TIER_POST_LIMITS[tier];
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO user_subscriptions (id, user_id, tier, post_limit, post_count, grace_period_days, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 14, ?, ?)`,
    )
    .bind(id, userId, tier, postLimit, now, now)
    .run();

  await createSubscriptionAuditLog(db, {
    user_id: userId,
    event_type: "subscription_created",
    new_value: JSON.stringify({ tier, post_limit: postLimit }),
  });

  return (await getUserSubscription(db, userId))!;
}

export async function getOrCreateUserSubscription(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<UserSubscription> {
  const existing = await getUserSubscription(db, userId);
  if (existing) return existing;
  return createUserSubscription(db, userId, "seedling");
}

export async function incrementPostCount(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const newCount = subscription.post_count + 1;
  const now = new Date().toISOString();
  const isAtLimit =
    subscription.post_limit !== null && newCount >= subscription.post_limit;

  let graceStart = subscription.grace_period_start;
  if (isAtLimit && !graceStart) {
    graceStart = now;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newCount, graceStart, now, userId)
    .run();

  return getUserSubscription(db, userId);
}

export async function decrementPostCount(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const newCount = Math.max(0, subscription.post_count - 1);
  const now = new Date().toISOString();

  // Clear grace period if now under limit
  let graceStart = subscription.grace_period_start;
  if (subscription.post_limit !== null && newCount < subscription.post_limit) {
    graceStart = null;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newCount, graceStart, now, userId)
    .run();

  return getUserSubscription(db, userId);
}

export async function setPostCount(
  db: D1DatabaseOrSession,
  userId: string,
  count: number,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const newCount = Math.max(0, count);
  const now = new Date().toISOString();
  const isAtLimit =
    subscription.post_limit !== null && newCount >= subscription.post_limit;

  // Set or clear grace period based on limit
  let graceStart = subscription.grace_period_start;
  if (isAtLimit && !graceStart) {
    graceStart = now;
  } else if (
    subscription.post_limit !== null &&
    newCount < subscription.post_limit
  ) {
    graceStart = null;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newCount, graceStart, now, userId)
    .run();

  return getUserSubscription(db, userId);
}

export async function updateSubscriptionTier(
  db: D1DatabaseOrSession,
  userId: string,
  newTier: SubscriptionTier,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const oldTier = subscription.tier;
  const newPostLimit = TIER_POST_LIMITS[newTier];
  const now = new Date().toISOString();

  // Clear grace period when upgrading (user is no longer at limit with new tier)
  let graceStart = subscription.grace_period_start;
  if (newPostLimit === null || subscription.post_count < newPostLimit) {
    graceStart = null;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET tier = ?, post_limit = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newTier, newPostLimit, graceStart, now, userId)
    .run();

  // Determine event type
  const tierOrder: Record<SubscriptionTier, number> = {
    seedling: 0,
    sapling: 1,
    evergreen: 2,
    canopy: 3,
    platform: 4,
  };
  const eventType: SubscriptionAuditEventType =
    tierOrder[newTier] > tierOrder[oldTier]
      ? "tier_upgraded"
      : "tier_downgraded";

  await createSubscriptionAuditLog(db, {
    user_id: userId,
    event_type: eventType,
    old_value: JSON.stringify({
      tier: oldTier,
      post_limit: subscription.post_limit,
    }),
    new_value: JSON.stringify({ tier: newTier, post_limit: newPostLimit }),
  });

  return getUserSubscription(db, userId);
}

export function getSubscriptionStatus(
  subscription: UserSubscription,
): SubscriptionStatus {
  const {
    tier,
    post_count,
    post_limit,
    grace_period_start,
    grace_period_days,
  } = subscription;

  const posts_remaining =
    post_limit !== null ? Math.max(0, post_limit - post_count) : null;
  const percentage_used =
    post_limit !== null ? Math.min(100, (post_count / post_limit) * 100) : null;
  const is_at_limit = post_limit !== null && post_count >= post_limit;

  let is_in_grace_period = false;
  let grace_period_days_remaining: number | null = null;

  if (grace_period_start) {
    is_in_grace_period = true;
    const graceStart = new Date(grace_period_start);
    const graceEnd = new Date(
      graceStart.getTime() + grace_period_days * 24 * 60 * 60 * 1000,
    );
    const msRemaining = graceEnd.getTime() - Date.now();
    grace_period_days_remaining = Math.max(
      0,
      Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
    );
  }

  const grace_expired =
    grace_period_days_remaining !== null && grace_period_days_remaining <= 0;
  const can_create_post =
    !is_at_limit || (is_in_grace_period && !grace_expired);
  const upgrade_required = is_at_limit && grace_expired;

  return {
    tier,
    post_count,
    post_limit,
    posts_remaining,
    percentage_used,
    is_at_limit,
    is_in_grace_period,
    grace_period_days_remaining,
    can_create_post,
    upgrade_required,
  };
}

export async function canUserCreatePost(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<{
  allowed: boolean;
  status: SubscriptionStatus;
  subscription: UserSubscription;
}> {
  const subscription = await getOrCreateUserSubscription(db, userId);
  const status = getSubscriptionStatus(subscription);
  return { allowed: status.can_create_post, status, subscription };
}

export async function createSubscriptionAuditLog(
  db: D1DatabaseOrSession,
  data: {
    user_id: string;
    event_type: SubscriptionAuditEventType;
    old_value?: string;
    new_value?: string;
  },
): Promise<void> {
  const id = generateUUID();
  await db
    .prepare(
      `INSERT INTO subscription_audit_log (id, user_id, event_type, old_value, new_value) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.user_id,
      data.event_type,
      data.old_value || null,
      data.new_value || null,
    )
    .run();
}

// ==================== User Sessions ====================

export async function createUserSession(
  db: D1DatabaseOrSession,
  data: {
    user_id: string;
    client_id: string;
    session_token_hash: string;
    expires_at: string;
  },
): Promise<string> {
  const id = generateUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO user_sessions (id, user_id, client_id, session_token_hash, last_used_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .bind(
      id,
      data.user_id,
      data.client_id,
      data.session_token_hash,
      now,
      data.expires_at,
    )
    .run();
  return id;
}

export async function getSessionByTokenHash(
  db: D1DatabaseOrSession,
  tokenHash: string,
): Promise<UserSession | null> {
  const now = new Date().toISOString();
  return db
    .prepare(
      `SELECT * FROM user_sessions WHERE session_token_hash = ? AND is_active = 1 AND expires_at > ?`,
    )
    .bind(tokenHash, now)
    .first<UserSession>();
}

export async function updateSessionLastUsed(
  db: D1DatabaseOrSession,
  sessionId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE user_sessions SET last_used_at = ? WHERE id = ?`)
    .bind(now, sessionId)
    .run();
}

export async function revokeSession(
  db: D1DatabaseOrSession,
  sessionId: string,
): Promise<void> {
  await db
    .prepare(`UPDATE user_sessions SET is_active = 0 WHERE id = ?`)
    .bind(sessionId)
    .run();
}

export async function revokeAllUserSessions(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<void> {
  await db
    .prepare(`UPDATE user_sessions SET is_active = 0 WHERE user_id = ?`)
    .bind(userId)
    .run();
}

// ==================== User Client Preferences ====================

export async function getUserClientPreference(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<UserClientPreference | null> {
  return db
    .prepare(`SELECT * FROM user_client_preferences WHERE user_id = ?`)
    .bind(userId)
    .first<UserClientPreference>();
}

export async function updateLastUsedClient(
  db: D1DatabaseOrSession,
  userId: string,
  clientId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO user_client_preferences (user_id, last_used_client_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_used_client_id = ?, updated_at = ?`,
    )
    .bind(userId, clientId, now, clientId, now)
    .run();
}

// ==================== Client Domain Queries ====================

export async function getClientByDomain(
  db: D1DatabaseOrSession,
  domain: string,
): Promise<Client | null> {
  return db
    .prepare(`SELECT * FROM clients WHERE domain = ?`)
    .bind(domain)
    .first<Client>();
}

export async function getAllClients(
  db: D1DatabaseOrSession,
): Promise<Client[]> {
  const result = await db
    .prepare(`SELECT * FROM clients ORDER BY name`)
    .all<Client>();
  return result.results || [];
}

// ==================== Admin Queries ====================

export function isEmailAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function isUserAdmin(
  db: D1DatabaseOrSession,
  userId: string,
): Promise<boolean> {
  const user = await getUserById(db, userId);
  if (!user) return false;
  return user.is_admin === 1 || isEmailAdmin(user.email);
}

export async function getAdminStats(
  db: D1DatabaseOrSession,
  engineDb?: D1Database,
): Promise<AdminStats> {
  // Total users
  const totalUsersResult = await db
    .prepare(`SELECT COUNT(*) as count FROM users`)
    .first<{ count: number }>();

  // Users by provider
  const providerResults = await db
    .prepare(`SELECT provider, COUNT(*) as count FROM users GROUP BY provider`)
    .all<{ provider: string; count: number }>();

  // Users by subscription tier
  const tierResults = await db
    .prepare(
      `SELECT tier, COUNT(*) as count FROM user_subscriptions GROUP BY tier`,
    )
    .all<{ tier: string; count: number }>();

  // Recent logins (last 50)
  const recentLogins = await db
    .prepare(
      `SELECT * FROM audit_log WHERE event_type = 'login' ORDER BY created_at DESC LIMIT 50`,
    )
    .all<AuditLog>();

  // Total clients
  const totalClientsResult = await db
    .prepare(`SELECT COUNT(*) as count FROM clients`)
    .first<{ count: number }>();

  // GroveEngine: Email signups count
  let emailSignupsCount = 0;
  if (engineDb) {
    const emailSignupsResult = await engineDb
      .prepare(`SELECT COUNT(*) as count FROM email_signups`)
      .first<{ count: number }>();
    emailSignupsCount = emailSignupsResult?.count ?? 0;
  }

  return {
    total_users: totalUsersResult?.count ?? 0,
    users_by_provider: Object.fromEntries(
      providerResults.results?.map((r) => [r.provider, r.count]) ?? [],
    ),
    users_by_tier: Object.fromEntries(
      tierResults.results?.map((r) => [r.tier, r.count]) ?? [],
    ),
    recent_logins: recentLogins.results ?? [],
    total_clients: totalClientsResult?.count ?? 0,
    email_signups_count: emailSignupsCount,
  };
}

export async function getAllUsers(
  db: D1DatabaseOrSession,
  limit: number = 50,
  offset: number = 0,
): Promise<User[]> {
  const result = await db
    .prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(limit, offset)
    .all<User>();
  return result.results || [];
}

export async function getAuditLogs(
  db: D1DatabaseOrSession,
  options: { limit?: number; offset?: number; eventType?: string },
): Promise<AuditLog[]> {
  const { limit = 100, offset = 0, eventType } = options;

  let query = `SELECT * FROM audit_log`;
  const params: (string | number)[] = [];

  if (eventType) {
    query += ` WHERE event_type = ?`;
    params.push(eventType);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<AuditLog>();
  return result.results || [];
}

// ==================== Device Codes (RFC 8628) ====================

/**
 * Create a new device code record
 * Note: device_code should already be hashed before passing to this function
 */
export async function createDeviceCode(
  db: D1DatabaseOrSession,
  data: {
    device_code_hash: string;
    user_code: string;
    client_id: string;
    scope?: string;
    expires_at: number;
    interval: number;
  },
): Promise<string> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO device_codes (id, device_code_hash, user_code, client_id, scope, expires_at, interval, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.device_code_hash,
      data.user_code,
      data.client_id,
      data.scope || null,
      data.expires_at,
      data.interval,
      now,
    )
    .run();

  return id;
}

/**
 * Get device code by user code (for authorization UI)
 * User codes are stored in plaintext for case-insensitive lookup
 */
export async function getDeviceCodeByUserCode(
  db: D1DatabaseOrSession,
  userCode: string,
): Promise<DeviceCode | null> {
  // Normalize: remove hyphens and convert to uppercase
  const normalizedCode = userCode.replace(/[-\s]/g, "").toUpperCase();

  // User codes are stored with hyphen format (XXXX-XXXX)
  // Try both formats for flexibility
  const formattedCode =
    normalizedCode.length === 8
      ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
      : userCode;

  const result = await db
    .prepare("SELECT * FROM device_codes WHERE user_code = ? OR user_code = ?")
    .bind(formattedCode, userCode)
    .first<DeviceCode>();

  return result;
}

/**
 * Get device code by hashed device code (for polling)
 */
export async function getDeviceCodeByHash(
  db: D1DatabaseOrSession,
  deviceCodeHash: string,
): Promise<DeviceCode | null> {
  const result = await db
    .prepare("SELECT * FROM device_codes WHERE device_code_hash = ?")
    .bind(deviceCodeHash)
    .first<DeviceCode>();

  return result;
}

/**
 * Authorize a device code (user approved)
 */
export async function authorizeDeviceCode(
  db: D1DatabaseOrSession,
  id: string,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE device_codes SET status = 'authorized', user_id = ? WHERE id = ?`,
    )
    .bind(userId, id)
    .run();
}

/**
 * Deny a device code (user denied)
 */
export async function denyDeviceCode(
  db: D1DatabaseOrSession,
  id: string,
): Promise<void> {
  await db
    .prepare(`UPDATE device_codes SET status = 'denied' WHERE id = ?`)
    .bind(id)
    .run();
}

/**
 * Update device code poll tracking
 * Returns the updated device code
 */
export async function updateDevicePollCount(
  db: D1DatabaseOrSession,
  id: string,
): Promise<DeviceCode | null> {
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE device_codes SET poll_count = poll_count + 1, last_poll_at = ? WHERE id = ?`,
    )
    .bind(now, id)
    .run();

  return db
    .prepare("SELECT * FROM device_codes WHERE id = ?")
    .bind(id)
    .first<DeviceCode>();
}

/**
 * Increment the required poll interval (for slow_down response)
 */
export async function incrementDeviceInterval(
  db: D1DatabaseOrSession,
  id: string,
  incrementBy: number,
): Promise<void> {
  await db
    .prepare(`UPDATE device_codes SET interval = interval + ? WHERE id = ?`)
    .bind(incrementBy, id)
    .run();
}

/**
 * Mark device code as expired
 */
export async function expireDeviceCode(
  db: D1DatabaseOrSession,
  id: string,
): Promise<void> {
  await db
    .prepare(`UPDATE device_codes SET status = 'expired' WHERE id = ?`)
    .bind(id)
    .run();
}

/**
 * Check if user code is unique (for generation)
 */
export async function isUserCodeUnique(
  db: D1DatabaseOrSession,
  userCode: string,
): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM device_codes WHERE user_code = ?")
    .bind(userCode)
    .first();

  return result === null;
}

/**
 * Cleanup expired device codes
 */
export async function cleanupExpiredDeviceCodes(
  db: D1DatabaseOrSession,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("DELETE FROM device_codes WHERE expires_at < ?")
    .bind(now)
    .run();
}

/**
 * Delete a specific device code (after successful token exchange)
 */
export async function deleteDeviceCode(
  db: D1DatabaseOrSession,
  id: string,
): Promise<void> {
  await db.prepare("DELETE FROM device_codes WHERE id = ?").bind(id).run();
}
