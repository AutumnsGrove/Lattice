-- Better Auth Migration for Heartwood
-- This migration adds the tables required by Better Auth.
--
-- Tables use `ba_` prefix to clearly distinguish from legacy Heartwood tables.
-- The existing `users` table is preserved for backwards compatibility during migration.
--
-- Run with: wrangler d1 execute groveauth --file=./src/db/migrations/0001_better_auth.sql

-- =============================================================================
-- STEP 1: Create Better Auth user table (ba_user)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ba_user (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER DEFAULT 0,
    name TEXT,
    image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    -- Grove-specific extensions
    tenant_id TEXT,                      -- Multi-tenant association
    is_admin INTEGER DEFAULT 0,          -- Administrative access flag
    login_count INTEGER DEFAULT 0,       -- Track login frequency

    -- Moderation fields (replacing simple is_active)
    banned INTEGER DEFAULT 0,
    ban_reason TEXT,
    ban_expires INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ba_user_email ON ba_user(email);
CREATE INDEX IF NOT EXISTS idx_ba_user_tenant ON ba_user(tenant_id);

-- =============================================================================
-- STEP 2: Create Better Auth sessions table (ba_session)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ba_session (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,

    -- Cloudflare geolocation (via better-auth-cloudflare)
    country TEXT,
    city TEXT,
    region TEXT,
    timezone TEXT,

    FOREIGN KEY (user_id) REFERENCES ba_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ba_session_user_id ON ba_session(user_id);
CREATE INDEX IF NOT EXISTS idx_ba_session_token ON ba_session(token);
CREATE INDEX IF NOT EXISTS idx_ba_session_expires_at ON ba_session(expires_at);

-- =============================================================================
-- STEP 3: Create accounts table for OAuth provider connections (ba_account)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ba_account (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,            -- Provider's user ID
    provider_id TEXT NOT NULL,           -- 'google', 'github', etc.
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    id_token TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES ba_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ba_account_user_id ON ba_account(user_id);
CREATE INDEX IF NOT EXISTS idx_ba_account_provider ON ba_account(provider_id, account_id);

-- =============================================================================
-- STEP 4: Create verifications table for magic links (ba_verification)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ba_verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,            -- Email address
    value TEXT NOT NULL,                 -- Token value
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ba_verification_identifier ON ba_verification(identifier);
CREATE INDEX IF NOT EXISTS idx_ba_verification_expires_at ON ba_verification(expires_at);

-- =============================================================================
-- STEP 5: Create passkeys table for WebAuthn (ba_passkey)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ba_passkey (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT,                           -- User-provided name
    public_key TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT,                    -- 'singleDevice' or 'multiDevice'
    backed_up INTEGER DEFAULT 0,
    transports TEXT,                     -- JSON array
    created_at INTEGER NOT NULL,
    aaguid TEXT,                         -- Authenticator GUID

    FOREIGN KEY (user_id) REFERENCES ba_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ba_passkey_user_id ON ba_passkey(user_id);
CREATE INDEX IF NOT EXISTS idx_ba_passkey_credential_id ON ba_passkey(credential_id);

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- The following existing Heartwood tables are PRESERVED and unchanged:
-- - users: Legacy user table (will be migrated to ba_user)
-- - clients: OAuth client applications
-- - allowed_emails: Email allowlist
-- - audit_log: Security audit trail
-- - user_subscriptions: Subscription management
-- - subscription_audit_log: Subscription change tracking
-- - oauth_states: Temporary OAuth flow state (legacy)
-- - auth_codes: Authorization codes (legacy flow)
-- - refresh_tokens: JWT refresh tokens (legacy flow)
-- - magic_codes: Email verification codes (legacy flow)
-- - rate_limits: Rate limiting
-- - failed_attempts: Login attempt tracking
-- - user_sessions: Legacy D1 sessions
-- - user_client_preferences: Client preferences
--
-- After migration is complete and verified, legacy tables can be dropped.
-- See: 0002_cleanup_heartwood.sql (to be run after migration verification)
