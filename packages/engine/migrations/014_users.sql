-- Migration: Users Table for Authenticated Sessions
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/013_users.sql --remote
--
-- DEPENDENCIES: This migration requires the tenants table to exist.
-- Run order: Must run AFTER 009_create_tenants_only.sql
--
-- This migration creates the users table for storing authenticated users.
-- Different from user_onboarding (signup flow) - this tracks users who have
-- completed auth and may access tenant admin panels.
--
-- Flow: GroveAuth login → callback exchanges token → fetch /userinfo → UPSERT here

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Stores authenticated users from Heartwood (GroveAuth)
-- One user can own multiple tenants (future), or be a team member (future)

CREATE TABLE IF NOT EXISTS users (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on creation
  groveauth_id TEXT UNIQUE NOT NULL,      -- Heartwood user ID (sub claim)

  -- Profile (from GroveAuth /userinfo)
  email TEXT NOT NULL,                    -- Primary email
  display_name TEXT,                      -- Display name from GroveAuth
  avatar_url TEXT,                        -- Profile picture URL (if provided)

  -- Ownership (primary tenant this user owns)
  tenant_id TEXT,                         -- Foreign key to tenants table

  -- Session tracking
  last_login_at INTEGER,                  -- Last successful login timestamp
  login_count INTEGER DEFAULT 0,          -- Total login count

  -- Status
  is_active INTEGER DEFAULT 1,            -- 1 = active, 0 = suspended

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Index for GroveAuth lookups (primary auth method)
CREATE INDEX IF NOT EXISTS idx_users_groveauth ON users(groveauth_id);

-- Index for email lookups (admin, notifications)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for tenant ownership lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. UPSERT PATTERN:
--    On auth callback, use INSERT...ON CONFLICT to create or update user:
--
--    INSERT INTO users (id, groveauth_id, email, display_name, last_login_at, login_count)
--    VALUES (?, ?, ?, ?, unixepoch(), 1)
--    ON CONFLICT (groveauth_id) DO UPDATE SET
--      email = excluded.email,
--      display_name = excluded.display_name,
--      last_login_at = unixepoch(),
--      login_count = login_count + 1,
--      updated_at = unixepoch()
--
-- 2. TENANT ASSOCIATION:
--    - tenant_id is NULL until user creates/owns a tenant
--    - Set when tenant is created during onboarding
--    - Future: support multiple tenants via user_tenants junction table
--
-- 3. RELATIONSHIP TO OTHER TABLES:
--    - user_onboarding: Signup flow, tracks progress before tenant exists
--    - users: Authenticated users, tracks post-signup data
--    - tenants: The actual blog sites
--
-- 4. SESSION VERIFICATION:
--    - Access token from cookie is verified against GroveAuth
--    - User record provides local data without external API call
--    - getUserFromSession() helper loads user by groveauth_id
--
