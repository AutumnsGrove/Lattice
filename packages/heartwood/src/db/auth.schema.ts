/**
 * Better Auth Drizzle Schema for Heartwood
 *
 * This schema defines the tables required by Better Auth, extended with
 * Grove-specific fields for multi-tenancy and moderation.
 *
 * Table naming uses `ba_` prefix as per migration plan to clearly
 * distinguish Better Auth tables from legacy Heartwood tables.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// =============================================================================
// BETTER AUTH TABLES (ba_ prefix)
// =============================================================================

/**
 * ba_user - Core user identity
 *
 * Extended from Better Auth base schema with Grove-specific fields:
 * - tenantId: Multi-tenant association
 * - isAdmin: Administrative access flag
 * - loginCount: Track login frequency
 * - banned/banReason/banExpires: Moderation controls
 */
export const baUser = sqliteTable("ba_user", {
  // Better Auth core fields
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  name: text("name"),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // Grove-specific extensions
  tenantId: text("tenant_id"), // Multi-tenant association
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  loginCount: integer("login_count").default(0),

  // Moderation fields (replacing simple is_active)
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
});

/**
 * ba_session - Active user sessions
 *
 * Better Auth uses this for session management. With KV caching enabled,
 * frequently accessed sessions are cached in Cloudflare KV for speed.
 */
export const baSession = sqliteTable("ba_session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // Request metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Cloudflare geolocation (via better-auth-cloudflare)
  country: text("country"),
  city: text("city"),
  region: text("region"),
  timezone: text("timezone"),
});

/**
 * ba_account - OAuth provider connections
 *
 * Links users to their OAuth provider accounts (Google, GitHub, etc.).
 * A user can have multiple accounts linked.
 */
export const baAccount = sqliteTable("ba_account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(), // Provider's user ID
  providerId: text("provider_id").notNull(), // 'google', 'github', etc.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * ba_verification - Magic links and email verification tokens
 *
 * Stores temporary tokens for magic link authentication.
 * Tokens are deleted upon use (not marked as used).
 */
export const baVerification = sqliteTable("ba_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // Email address
  value: text("value").notNull(), // Token value
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * ba_passkey - WebAuthn credentials
 *
 * Stores passkey (WebAuthn) credentials for passwordless authentication.
 */
export const baPasskey = sqliteTable("ba_passkey", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  name: text("name"), // User-provided name for the passkey
  publicKey: text("public_key").notNull(),
  credentialId: text("credential_id").notNull().unique(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"), // 'singleDevice' or 'multiDevice'
  backedUp: integer("backed_up", { mode: "boolean" }).default(false),
  transports: text("transports"), // JSON array of transports
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  aaguid: text("aaguid"), // Authenticator attestation GUID
});

/**
 * ba_two_factor - Two-factor authentication secrets
 *
 * Stores TOTP secrets and backup codes for 2FA.
 */
export const baTwoFactor = sqliteTable("ba_two_factor", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => baUser.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(), // TOTP secret (base32 encoded)
  backupCodes: text("backup_codes"), // JSON array of hashed backup codes
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// =============================================================================
// GROVE-SPECIFIC TABLES (preserved from existing schema)
// =============================================================================

/**
 * Allowed emails - Email allowlist for admin-only access
 */
export const allowedEmails = sqliteTable("allowed_emails", {
  email: text("email").primaryKey(),
  addedAt: text("added_at").default("CURRENT_TIMESTAMP"),
  addedBy: text("added_by"),
});

/**
 * Clients - Registered OAuth client applications
 */
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull().unique(),
  clientSecretHash: text("client_secret_hash").notNull(),
  redirectUris: text("redirect_uris").notNull(), // JSON array
  allowedOrigins: text("allowed_origins").notNull(), // JSON array
  domain: text("domain"),
  isInternalService: integer("is_internal_service").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

/**
 * Audit log - Security event tracking
 */
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  clientId: text("client_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

/**
 * User subscriptions - Subscription tier management
 */
export const userSubscriptions = sqliteTable("user_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tier: text("tier").notNull().default("seedling"),
  postLimit: integer("post_limit"),
  postCount: integer("post_count").default(0),
  gracePeriodStart: text("grace_period_start"),
  gracePeriodDays: integer("grace_period_days").default(14),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  billingPeriodStart: text("billing_period_start"),
  billingPeriodEnd: text("billing_period_end"),
  customDomain: text("custom_domain"),
  customDomainVerified: integer("custom_domain_verified").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

/**
 * Subscription audit log - Subscription change tracking
 */
export const subscriptionAuditLog = sqliteTable("subscription_audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// =============================================================================
// BETTER AUTH SCHEMA EXPORTS
// =============================================================================
// Better Auth Drizzle adapter looks up tables by their modelName configuration.
// Since we use modelName: 'ba_user', 'ba_session', etc., the schema keys must match.

export const schema = {
  // Better Auth tables - keys must match modelName configurations
  ba_user: baUser,
  ba_session: baSession,
  ba_account: baAccount,
  ba_verification: baVerification,
  ba_passkey: baPasskey,
  ba_two_factor: baTwoFactor,
  // Grove-specific tables
  allowedEmails,
  clients,
  auditLog,
  userSubscriptions,
  subscriptionAuditLog,
};
