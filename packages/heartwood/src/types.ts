/**
 * Heartwood Type Definitions
 */

// D1 session type for read replication support
// Sessions ensure sequential consistency across queries within a request
export type D1DatabaseOrSession =
  | D1Database
  | ReturnType<D1Database["withSession"]>;

// Environment bindings for Cloudflare Workers
export interface Env {
  // D1 Database (Heartwood auth data)
  DB: D1Database;

  // D1 Database (GroveEngine data - email signups, etc.)
  ENGINE_DB: D1Database;

  // KV Namespace for Better Auth session caching
  SESSION_KV: KVNamespace;

  // Durable Objects (legacy - maintained for migration period)
  SESSIONS: DurableObjectNamespace;

  // R2 Storage binding (CDN assets)
  CDN_BUCKET: R2Bucket;

  // Environment variables
  AUTH_BASE_URL: string;
  ENVIRONMENT: string;
  CDN_URL: string;

  // Feature flags
  PUBLIC_SIGNUP_ENABLED?: string; // 'true' to allow public signup (bypass allowlist)

  // Passkey configuration (optional - defaults to 'grove.place')
  PASSKEY_RP_ID?: string;

  // Service-to-service authentication (optional — defense-in-depth for validate-service)
  SERVICE_SECRET?: string;

  // Secrets (set via wrangler secret put)
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
  SESSION_SECRET: string;
}

// Database Models
export interface Client {
  id: string;
  name: string;
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string; // JSON array
  allowed_origins: string; // JSON array
  domain: string | null; // Primary domain for redirects
  is_internal_service: number; // 0 or 1 - internal services get session tokens instead of auth codes
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: AuthProvider;
  provider_id: string | null;
  is_admin: number; // 0 or 1
  created_at: string;
  last_login: string | null;
}

export interface AllowedEmail {
  email: string;
  added_at: string;
  added_by: string | null;
}

export interface AuthCode {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: string;
  used: number;
  created_at: string;
}

export interface RefreshToken {
  id: string;
  token_hash: string;
  user_id: string;
  client_id: string;
  expires_at: string;
  revoked: number;
  created_at: string;
}

export interface MagicCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: number;
  created_at: string;
}

// Device authorization code (RFC 8628)
export interface DeviceCode {
  id: string;
  device_code_hash: string;
  user_code: string;
  client_id: string;
  scope: string | null;
  status: DeviceCodeStatus;
  user_id: string | null;
  poll_count: number;
  last_poll_at: number | null;
  interval: number;
  expires_at: number;
  created_at: number;
}

export type DeviceCodeStatus = "pending" | "authorized" | "denied" | "expired";

export interface RateLimit {
  key: string;
  count: number;
  window_start: string;
}

export interface FailedAttempt {
  email: string;
  attempts: number;
  last_attempt: string | null;
  locked_until: string | null;
}

export interface AuditLog {
  id: string;
  event_type: AuditEventType;
  user_id: string | null;
  client_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null; // JSON
  created_at: string;
}

// Enums
export type AuthProvider = "google" | "magic_code";

export type AuditEventType =
  | "login"
  | "logout"
  | "failed_login"
  | "token_exchange"
  | "token_refresh"
  | "token_revoke"
  | "magic_code_sent"
  | "magic_code_verified"
  | "device_code_created"
  | "device_code_authorized"
  | "device_code_denied"
  | "device_code_polled"
  | "passkey_registered"
  | "passkey_deleted"
  | "passkey_auth_success"
  | "passkey_auth_failed";

// API Request/Response Types
export interface TokenRequest {
  grant_type:
    | "authorization_code"
    | "refresh_token"
    | "urn:ietf:params:oauth:grant-type:device_code";
  code?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret: string;
  code_verifier?: string;
  refresh_token?: string;
  device_code?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// Device Authorization Response (RFC 8628 Section 3.2)
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface TokenInfo {
  active: boolean;
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  client_id?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  provider: AuthProvider;
}

// OAuth Provider Types
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

// JWT Payload
// Note: PII (email, name) intentionally excluded - clients should use /userinfo endpoint
export interface JWTPayload {
  sub: string;
  client_id: string;
  iss: string;
  iat: number;
  exp: number;
}

// Session state stored during OAuth flow
export interface OAuthState {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: string;
  is_internal_service?: boolean; // Cached from client to avoid re-fetch in callback
}

// Error types
export interface AuthError {
  error: string;
  error_description?: string;
}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export type SubscriptionTier =
  | "seedling"
  | "sapling"
  | "evergreen"
  | "canopy"
  | "platform";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  post_limit: number | null;
  post_count: number;
  grace_period_start: string | null;
  grace_period_days: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  custom_domain: string | null;
  custom_domain_verified: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAuditLog {
  id: string;
  user_id: string;
  event_type: SubscriptionAuditEventType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type SubscriptionAuditEventType =
  | "subscription_created"
  | "tier_upgraded"
  | "tier_downgraded"
  | "grace_period_started"
  | "grace_period_ended"
  | "post_limit_reached"
  | "post_archived"
  | "custom_domain_added"
  | "custom_domain_verified"
  | "custom_domain_removed";

export const TIER_POST_LIMITS: Record<SubscriptionTier, number | null> = {
  seedling: 250,
  sapling: 2000,
  evergreen: 10000,
  canopy: null,
  platform: null,
};

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  post_count: number;
  post_limit: number | null;
  posts_remaining: number | null;
  percentage_used: number | null;
  is_at_limit: boolean;
  is_in_grace_period: boolean;
  grace_period_days_remaining: number | null;
  can_create_post: boolean;
  upgrade_required: boolean;
}

// =============================================================================
// SESSION & ADMIN TYPES
// =============================================================================

// SessionDO types (Durable Object-based sessions)
export interface DOSession {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ParsedSessionCookie {
  sessionId: string;
  userId: string;
  signature: string;
}

// Legacy D1-based session (for backwards compatibility)
export interface UserSession {
  id: string;
  user_id: string;
  client_id: string;
  session_token_hash: string;
  last_used_at: string;
  expires_at: string;
  is_active: number;
}

export interface UserClientPreference {
  user_id: string;
  last_used_client_id: string | null;
  updated_at: string;
}

export interface AdminStats {
  total_users: number;
  users_by_provider: Record<string, number>;
  users_by_tier: Record<string, number>;
  recent_logins: AuditLog[];
  total_clients: number;
  // GroveEngine stats
  email_signups_count: number;
}

export const ADMIN_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];
