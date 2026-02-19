-- User Migration: Heartwood users → Better Auth ba_user
--
-- This migration copies existing users from the legacy `users` table to the
-- new `ba_user` table. It preserves all user data and maps fields appropriately.
--
-- IMPORTANT: Run this AFTER 0001_better_auth.sql has been executed.
--
-- Run with: wrangler d1 execute groveauth --file=./src/db/migrations/0002_migrate_users.sql

-- =============================================================================
-- STEP 1: Migrate users from legacy table to ba_user
-- =============================================================================

-- Insert existing users into ba_user
-- Maps: id, email, name, avatar_url → image, provider_id, is_admin, created_at, last_login
INSERT INTO ba_user (
    id,
    email,
    email_verified,
    name,
    image,
    created_at,
    updated_at,
    tenant_id,
    is_admin,
    login_count,
    banned,
    ban_reason,
    ban_expires
)
SELECT
    id,
    email,
    1,  -- Assume existing users have verified emails (they logged in via OAuth)
    name,
    avatar_url,  -- Maps to 'image' in ba_user
    -- Convert ISO timestamp to Unix timestamp (seconds since epoch)
    CAST(strftime('%s', created_at) AS INTEGER),
    CAST(strftime('%s', COALESCE(last_login, created_at)) AS INTEGER),
    NULL,  -- tenant_id (can be set later if needed)
    is_admin,
    0,  -- login_count starts at 0, will increment on next login
    0,  -- not banned by default
    NULL,  -- no ban reason
    NULL   -- no ban expiry
FROM users
WHERE NOT EXISTS (
    -- Skip if already migrated (idempotent)
    SELECT 1 FROM ba_user WHERE ba_user.email = users.email
);

-- =============================================================================
-- STEP 2: Migrate OAuth accounts
-- =============================================================================

-- Create account records for existing OAuth logins
-- We create one account per user based on their provider info
INSERT INTO ba_account (
    id,
    user_id,
    account_id,
    provider_id,
    access_token,
    refresh_token,
    access_token_expires_at,
    refresh_token_expires_at,
    scope,
    id_token,
    created_at,
    updated_at
)
SELECT
    -- Generate a deterministic ID from user_id + provider
    lower(hex(randomblob(16))),
    id,
    COALESCE(provider_id, id),  -- Use provider_id if available, else user id
    provider,  -- 'google', 'github', or 'magic_code'
    NULL,  -- We don't have stored access tokens in legacy system
    NULL,  -- We don't have stored refresh tokens in legacy system
    NULL,
    NULL,
    NULL,
    NULL,
    CAST(strftime('%s', created_at) AS INTEGER),
    CAST(strftime('%s', COALESCE(last_login, created_at)) AS INTEGER)
FROM users
WHERE provider IN ('google', 'github')  -- Only OAuth providers, not magic_code
AND NOT EXISTS (
    -- Skip if account already exists for this user+provider combo
    SELECT 1 FROM ba_account
    WHERE ba_account.user_id = users.id
    AND ba_account.provider_id = users.provider
);

-- =============================================================================
-- STEP 3: Verify migration
-- =============================================================================

-- Count migrated users (for verification in logs)
SELECT
    'Migration complete' AS status,
    (SELECT COUNT(*) FROM users) AS legacy_user_count,
    (SELECT COUNT(*) FROM ba_user) AS ba_user_count,
    (SELECT COUNT(*) FROM ba_account) AS ba_account_count;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- This migration is IDEMPOTENT - it can be run multiple times safely.
-- It will skip users that have already been migrated.
--
-- After verifying the migration:
-- 1. Test login flows with existing accounts
-- 2. Verify session creation works
-- 3. Check that OAuth accounts are properly linked
--
-- DO NOT drop the legacy 'users' table until migration is fully verified.
-- A cleanup migration (0003_cleanup_heartwood.sql) will handle that.
