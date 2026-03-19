-- Migration 101: BillingHub — Create billing_audit_log
--
-- Creates the billing_audit_log table for billing-api mutation audit trail.
--
-- NOTE: The original migration also attempted to rebuild `tenants` and
-- `platform_billing` to fix stale CHECK constraints ('free' → 'wanderer').
-- Table rebuilds are not possible in D1 because foreign_keys is always ON
-- and dozens of tables reference tenants(id). The CHECK constraint fix is
-- deferred to a future migration that can handle the FK dependency chain.
-- The data was already renamed by migration 096 — only the constraint is stale.
--
-- billing_audit_log is referenced by the BillingHub spec but was never created.
-- billing-api logs all mutations (checkout, cancel, resume, plan changes) here.

-- =============================================================================
-- Create billing_audit_log table
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


-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- DEFERRED: PLAN CHECK CONSTRAINT
--   Old: ('free', 'seedling', 'sapling', 'oak', 'evergreen')
--   New: ('wanderer', 'seedling', 'sapling', 'oak', 'evergreen')
--   D1 keeps foreign_keys=ON always, so DROP TABLE on tenants/platform_billing
--   fails due to FK references from ~40 other tables. Needs a multi-step
--   migration that rebuilds referencing tables first, or application-level
--   validation. Data is correct (096 renamed), only the CHECK is stale.
--
-- BILLING_AUDIT_LOG:
--   billing-api writes here via its D1 binding (grove-engine-db).
--   The generic audit_log (035) is used by engine for broader audit events.
--   billing_audit_log is billing-specific with provider references and
--   constrained action types for reliable querying.
--
--   Retention: billing audit records are kept indefinitely (regulatory).
--   The webhook_events table (007) has 120-day retention for raw payloads.
--
-- FOREIGN KEY NOTE:
--   billing_audit_log intentionally does NOT have a FK to tenants — audit
--   records must survive tenant deletion for compliance.
