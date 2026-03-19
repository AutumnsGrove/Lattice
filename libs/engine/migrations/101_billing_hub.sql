-- Migration 101: BillingHub — Fix plan CHECK constraints + create billing_audit_log
--
-- Three changes:
--   1. Rebuild `tenants` table: replace stale plan CHECK ('free'→'wanderer')
--   2. Rebuild `platform_billing` table: same plan CHECK fix
--   3. Create `billing_audit_log` table for billing-api mutation audit trail
--
-- Background:
--   Migration 096 renamed 'free' → 'wanderer' in data (UPDATE rows) but never
--   rebuilt the tables to fix the CHECK constraint. The constraint still says
--   ('free', 'seedling', 'sapling', 'oak', 'evergreen'). SQLite requires a
--   full table rebuild to alter CHECK constraints.
--
--   billing_audit_log is referenced by the BillingHub spec but was never created.
--   billing-api logs all mutations (checkout, cancel, resume, plan changes) here.
--
-- Run with:
--   npx wrangler d1 execute grove-engine-db --file=libs/engine/migrations/101_billing_hub.sql --local
--   npx wrangler d1 execute grove-engine-db --file=libs/engine/migrations/101_billing_hub.sql --remote

-- Disable FK enforcement during table rebuilds (re-enabled at end)
PRAGMA foreign_keys = OFF;

-- =============================================================================
-- STEP 1: Rebuild tenants table with correct plan CHECK
-- =============================================================================
-- Current columns (from 013 + 038 + 053 + 076):
--   id, subdomain, display_name, email, plan, storage_used, post_count,
--   custom_domain, theme, accent_color, active, created_at, updated_at,
--   encrypted_dek (038), last_activity_at (053), reclamation_status (053),
--   meadow_opt_in (076)

CREATE TABLE tenants_new (
  -- Identity
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Subscription & Limits (wanderer replaces free)
  plan TEXT DEFAULT 'seedling'
    CHECK (plan IN ('wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  -- Oak+ Features
  custom_domain TEXT,

  -- Customization
  theme TEXT DEFAULT 'default',
  accent_color TEXT,

  -- Status
  active INTEGER DEFAULT 1,

  -- Encryption (038)
  encrypted_dek TEXT,

  -- Activity tracking (053)
  last_activity_at INTEGER DEFAULT (unixepoch()),
  reclamation_status TEXT,

  -- Social (076)
  meadow_opt_in INTEGER DEFAULT 0,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy all data from existing table
-- NOTE: Columns from migrations 053 (last_activity_at, reclamation_status) and
-- 076 (meadow_opt_in) may not exist in production despite being tracked as applied.
-- Use defaults for those columns — the new table definition provides them.
INSERT INTO tenants_new (
  id, subdomain, display_name, email, plan, storage_used, post_count,
  custom_domain, theme, accent_color, active, encrypted_dek,
  created_at, updated_at
)
SELECT
  id, subdomain, display_name, email, plan, storage_used, post_count,
  custom_domain, theme, accent_color, active, encrypted_dek,
  created_at, updated_at
FROM tenants;

DROP TABLE tenants;
ALTER TABLE tenants_new RENAME TO tenants;

-- Recreate all indexes (from 013 + 053)
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_activity ON tenants(plan, last_activity_at)
  WHERE plan = 'wanderer' AND active = 1;


-- =============================================================================
-- STEP 2: Rebuild platform_billing table with correct plan CHECK
-- =============================================================================

CREATE TABLE platform_billing_new (
  -- Identity
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Plan (wanderer replaces free)
  plan TEXT NOT NULL DEFAULT 'seedling'
    CHECK (plan IN ('wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),

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

INSERT INTO platform_billing_new SELECT * FROM platform_billing;
DROP TABLE platform_billing;
ALTER TABLE platform_billing_new RENAME TO platform_billing;

-- Recreate indexes (from 013)
CREATE INDEX IF NOT EXISTS idx_platform_billing_tenant ON platform_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_billing_status ON platform_billing(status);
CREATE INDEX IF NOT EXISTS idx_platform_billing_plan ON platform_billing(plan);
CREATE INDEX IF NOT EXISTS idx_platform_billing_provider ON platform_billing(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;


-- =============================================================================
-- STEP 3: Create billing_audit_log table
-- =============================================================================
-- Used by billing-api to log all mutation operations (checkout, cancel, resume,
-- plan changes, webhook-triggered status updates). Separate from the generic
-- audit_log (035) because billing audit has different retention and query
-- patterns — keyed by action type, includes provider references, and may be
-- queried by billing-api independently of the engine.

CREATE TABLE IF NOT EXISTS billing_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- What happened
  action TEXT NOT NULL
    CHECK (action IN (
      'checkout_started',
      'checkout_completed',
      'plan_changed',
      'subscription_cancelled',
      'subscription_resumed',
      'status_changed',
      'payment_failed',
      'payment_succeeded',
      'portal_opened',
      'webhook_processed'
    )),

  -- Who did it
  actor TEXT,                              -- user_id, 'system', or 'stripe'

  -- Context
  details TEXT,                            -- JSON: action-specific metadata
  provider_event_id TEXT,                  -- Stripe event ID (for webhook-triggered actions)

  -- Audit trail
  ip_address TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_tenant ON billing_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_audit_action ON billing_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_audit_provider ON billing_audit_log(provider_event_id)
  WHERE provider_event_id IS NOT NULL;


-- Re-enable FK enforcement and verify integrity
PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- PLAN CHECK CONSTRAINT (Steps 1 & 2):
--   Old: ('free', 'seedling', 'sapling', 'oak', 'evergreen')
--   New: ('wanderer', 'seedling', 'sapling', 'oak', 'evergreen')
--
--   Migration 096 already renamed all 'free' data to 'wanderer', so no data
--   migration is needed here — only the constraint fix.
--
-- BILLING_AUDIT_LOG (Step 3):
--   billing-api writes here via its D1 binding (grove-engine-db).
--   The generic audit_log (035) is used by engine for broader audit events.
--   billing_audit_log is billing-specific with provider references and
--   constrained action types for reliable querying.
--
--   Retention: billing audit records are kept indefinitely (regulatory).
--   The webhook_events table (007) has 120-day retention for raw payloads.
--
-- FOREIGN KEY NOTE:
--   platform_billing.tenant_id references tenants(id) ON DELETE CASCADE.
--   billing_audit_log intentionally does NOT have a FK to tenants — audit
--   records must survive tenant deletion for compliance.
