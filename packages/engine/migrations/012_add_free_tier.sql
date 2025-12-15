-- Migration: Add Free Tier Support
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/012_add_free_tier.sql --remote
--
-- This migration adds support for the free tier (Meadow-only users).
-- Free tier users have no blog, only access to Meadow social features.
--
-- Tier structure after migration:
--   - free:      Meadow access only, no blog, rate-limited comments
--   - seedling:  $8/mo  - 50 posts, 1GB, 3 themes
--   - sapling:   $12/mo - 250 posts, 5GB, 10 themes
--   - oak:       $25/mo - Unlimited, 20GB, theme customizer, BYOD domain
--   - evergreen: $35/mo - Unlimited, 100GB, domain included

-- =============================================================================
-- STEP 1: Recreate tenants table with free tier and active column
-- =============================================================================
-- SQLite requires table recreation to modify CHECK constraints

-- Create new tenants table with updated constraint
CREATE TABLE tenants_new (
  -- Identity
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Subscription & Limits (now includes 'free')
  plan TEXT DEFAULT 'seedling' CHECK (plan IN ('free', 'seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  -- Oak+ Features
  custom_domain TEXT,

  -- Customization
  theme TEXT DEFAULT 'default',
  accent_color TEXT,                        -- HSL or hex color for theme

  -- Status
  active INTEGER DEFAULT 1,                 -- 1 = active, 0 = suspended/inactive

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy data from old table (active defaults to 1 for existing tenants)
INSERT INTO tenants_new (id, subdomain, display_name, email, plan, storage_used, post_count, custom_domain, theme, created_at, updated_at)
SELECT id, subdomain, display_name, email, plan, storage_used, post_count, custom_domain, theme, created_at, updated_at
FROM tenants;

-- Drop old table
DROP TABLE tenants;

-- Rename new table
ALTER TABLE tenants_new RENAME TO tenants;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- =============================================================================
-- STEP 2: Recreate platform_billing table with free tier support
-- =============================================================================

-- Create new platform_billing table with updated constraint
CREATE TABLE platform_billing_new (
  -- Identity
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Plan (now includes 'free')
  plan TEXT NOT NULL DEFAULT 'seedling'
    CHECK (plan IN ('free', 'seedling', 'sapling', 'oak', 'evergreen')),

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
CREATE INDEX IF NOT EXISTS idx_platform_billing_plan ON platform_billing(plan);
CREATE INDEX IF NOT EXISTS idx_platform_billing_provider ON platform_billing(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- FREE TIER BEHAVIOR:
--   - No blog (subdomain returns "upgrade to start your blog" page)
--   - Access to Meadow social features only
--   - Rate limits: 20 public comments/week, 50 private replies/day
--   - No Stripe subscription (platform_billing record has status='active', no provider IDs)
--
-- UPGRADE PATH:
--   - Free → Paid: Creates Stripe subscription, changes plan
--   - No downgrade from paid to free (cancel = keep until period end)
--
