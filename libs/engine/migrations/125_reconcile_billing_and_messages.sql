-- Migration 125: the last two tables the backfill skipped
-- Database: D1 (SQLite) - grove-engine-db
--
-- Companion to 124, and the same story (#1692): `d1_migrations` lists
-- migrations that never ran, so the files are skipped and the database keeps
-- whatever shape it had. 124 repaired `tenants` and the missing indexes; this
-- finishes the two remaining tables, both of which can be rebuilt safely
-- because **nothing references either of them** — verified against production:
-- zero foreign keys point at `platform_billing` or `grove_messages`.
--
-- (That is the distinction that matters. 116 must never run because `tenants`
-- has 30 dependents and D1's enforced foreign keys cascade the implicit
-- `DELETE` through all of them. No such hazard exists here.)

-- ---------------------------------------------------------------------------
-- platform_billing: plan defaults to a tier that no longer exists
-- ---------------------------------------------------------------------------
--
-- 117_platform_billing_plan_check_fix.sql set this default to 'seedling' and
-- is logged as applied on 2026-08-26. Production still reads
-- `DEFAULT 'free'` — a tier renamed to 'wanderer' in 096. All 13 rows carry a
-- current plan ('wanderer'/'seedling'/'evergreen') because every writer names
-- one, so this only bites an insert that forgets to.
--
-- 117 becomes a no-op in the same commit, so this file is the only place the
-- swap lives and a fresh bootstrap does not rebuild the table twice.

CREATE TABLE platform_billing_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  plan TEXT NOT NULL DEFAULT 'seedling'
    CHECK (plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),

  provider_customer_id TEXT,
  provider_subscription_id TEXT,

  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0,

  trial_end INTEGER,

  payment_method_last4 TEXT,
  payment_method_brand TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Explicit column list, not `SELECT *` — see 116's note on why positional
-- copies across a rebuild are a trap.
INSERT INTO platform_billing_new (
  id, tenant_id, plan, status,
  provider_customer_id, provider_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end, trial_end,
  payment_method_last4, payment_method_brand,
  created_at, updated_at
)
SELECT
  id, tenant_id, plan, status,
  provider_customer_id, provider_subscription_id,
  current_period_start, current_period_end, cancel_at_period_end, trial_end,
  payment_method_last4, payment_method_brand,
  created_at, updated_at
FROM platform_billing;

DROP TABLE platform_billing;

ALTER TABLE platform_billing_new RENAME TO platform_billing;

-- All three, not just the ones 117 named: DROP TABLE takes every existing
-- index with it, including the ones 124 has just added.
CREATE INDEX idx_platform_billing_status ON platform_billing(status);
CREATE INDEX idx_platform_billing_plan ON platform_billing(plan);
CREATE INDEX idx_platform_billing_provider
  ON platform_billing(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- grove_messages: production can only send to two of the five channels
-- ---------------------------------------------------------------------------
--
-- 047_grove_messages_channels.sql widens the CHECK to
-- ('landing', 'arbor', 'plant', 'meadow', 'clearing'), matching
-- GROVE_MESSAGE_CHANNELS in libs/engine/src/lib/server/services/messages.ts.
-- It never ran: production still has 046's two-channel CHECK, so inserting a
-- 'clearing' status message fails with SQLITE_CONSTRAINT_CHECK even though the
-- shared type says it is valid.
--
-- Here production catches up to the code rather than the other way round — the
-- table has zero rows, so nothing is at stake either way, and narrowing the
-- code to two channels would be a product decision nobody made.
--
-- ('meadow' is in the list because the type says so. If Meadow's revival is
-- ever settled differently, this CHECK is not the thing to argue with.)

CREATE TABLE grove_messages_new (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('landing', 'arbor', 'plant', 'meadow', 'clearing')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info'
    CHECK(message_type IN ('info', 'warning', 'celebration', 'update')),
  pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO grove_messages_new (
  id, channel, title, body, message_type, pinned, published,
  expires_at, created_by, created_at, updated_at
)
SELECT
  id, channel, title, body, message_type, pinned, published,
  expires_at, created_by, created_at, updated_at
FROM grove_messages;

DROP TABLE grove_messages;

ALTER TABLE grove_messages_new RENAME TO grove_messages;

CREATE INDEX idx_grove_messages_channel_published
  ON grove_messages(channel, published, created_at DESC);

CREATE INDEX idx_grove_messages_expires
  ON grove_messages(expires_at)
  WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Indexes that only a replayed history loses
-- ---------------------------------------------------------------------------
--
-- Production has these; a from-empty bootstrap does not, because the rebuild
-- migrations above them (107_fix_users_schema for `sessions`, 014/001 for
-- `magic_codes`) drop and re-create those tables without re-creating every
-- index that was on them. Production escaped it by being hand-patched.
--
-- This is the local-dev-parity half of #1692: a fresh database should be the
-- same database as production, or the next person chases a phantom.
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_codes_expires_at ON magic_codes(expires_at);
