-- Migration: Update Subscription Tier Names
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/010_update_tier_names.sql --remote
--
-- This migration updates tier names from the old 3-tier system to the new 4-tier
-- forest-themed naming convention:
--
-- Old tier names:        New tier names:
-- - starter          →   seedling     ($8/mo)
-- - (new tier)       →   sapling      ($12/mo)
-- - professional     →   oak          ($25/mo)
-- - business         →   evergreen    ($35/mo)
--
-- Mapping rationale:
-- - 'starter' → 'seedling': Both are entry-level tiers
-- - 'professional' → 'oak': Both are mid-tier with custom domain (BYOD)
-- - 'business' → 'evergreen': Both are top-tier with full service
--
-- Note: 'sapling' is a new tier - existing 'starter' users remain on 'seedling'

-- =============================================================================
-- STEP 1: Update existing data in tenants table
-- =============================================================================

UPDATE tenants
SET plan = CASE plan
    WHEN 'starter' THEN 'seedling'
    WHEN 'professional' THEN 'oak'
    WHEN 'business' THEN 'evergreen'
    ELSE plan
END
WHERE plan IN ('starter', 'professional', 'business');

-- =============================================================================
-- STEP 2: Update existing data in platform_billing table
-- =============================================================================

UPDATE platform_billing
SET plan = CASE plan
    WHEN 'starter' THEN 'seedling'
    WHEN 'professional' THEN 'oak'
    WHEN 'business' THEN 'evergreen'
    ELSE plan
END
WHERE plan IN ('starter', 'professional', 'business');

-- =============================================================================
-- STEP 3: Recreate tenants table with new CHECK constraint
-- =============================================================================
-- SQLite requires table recreation to modify CHECK constraints

-- Create new tenants table with updated constraint
CREATE TABLE tenants_new (
  -- Identity
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Subscription & Limits (updated CHECK constraint)
  plan TEXT DEFAULT 'seedling' CHECK (plan IN ('seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  -- Business Plan Features
  custom_domain TEXT,

  -- Customization
  theme TEXT DEFAULT 'default',

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy data from old table
INSERT INTO tenants_new SELECT * FROM tenants;

-- Drop old table
DROP TABLE tenants;

-- Rename new table
ALTER TABLE tenants_new RENAME TO tenants;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- =============================================================================
-- STEP 4: Recreate platform_billing table with new CHECK constraint
-- =============================================================================

-- Create new platform_billing table with updated constraint
CREATE TABLE platform_billing_new (
  -- Identity
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Plan (updated CHECK constraint)
  plan TEXT NOT NULL DEFAULT 'seedling'
    CHECK (plan IN ('seedling', 'sapling', 'oak', 'evergreen')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),

  -- Provider references
  provider_customer_id TEXT,
  provider_subscription_id TEXT,

  -- Billing period (Unix timestamps)
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0,

  -- Trial
  trial_end INTEGER,

  -- Payment method
  payment_method_last4 TEXT,
  payment_method_brand TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO platform_billing_new SELECT * FROM platform_billing;

-- Drop old table
DROP TABLE platform_billing;

-- Rename new table
ALTER TABLE platform_billing_new RENAME TO platform_billing;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_platform_billing_tenant ON platform_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_billing_status ON platform_billing(status);
CREATE INDEX IF NOT EXISTS idx_platform_billing_provider ON platform_billing(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- New tier structure:
--   - seedling:  50 posts,  1GB storage, community support
--   - sapling:  250 posts,  5GB storage, email support, email forwarding
--   - oak:      unlimited, 20GB storage, BYOD custom domain, full email, priority support
--   - evergreen: unlimited, 100GB storage, domain included, full email, 8hrs support
