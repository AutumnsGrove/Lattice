-- Migration 124: Install what the ledger already claims, and what production lacks
-- Database: D1 (SQLite) - grove-engine-db
--
-- Why this file exists (#1692):
--
-- `d1_migrations` in grove-engine-db is not a record of what ran — it is a
-- claim, and parts of it were written by hand. 95 of its 147 rows share the
-- single timestamp `2026-02-28 14:53:05`: a bulk backfill, not 95 migration
-- runs. Everything under that timestamp was skipped from then on, because
-- `wrangler d1 migrations apply` trusts the ledger and never looks again.
--
-- The live consequence: `tenants` has never had `last_activity_at`.
-- `updateLastActivity()` writes it on every post save and image upload; the
-- write fails, the error is caught and logged, and nothing ever reads the
-- result loudly enough for anyone to notice.
--
-- 053_wanderer_tier.sql was supposed to add this and is logged as applied.
-- 116_tenants_plan_check_fix.sql was then written specifically to repair that
-- gap, and is also logged as applied while its effect is absent (production
-- `tenants` still has 15 columns and `plan` still defaults to 'free').
--
-- 116's approach must never run here: it drops `tenants` and renames a copy
-- into its place, and D1 enforces foreign keys, so the implicit
-- `DELETE FROM tenants` cascades through all 27 dependent tables. Reproduced
-- against a copy of production's schema on 2026-11-21: one post referencing
-- the tenant disappeared. The ledger being wrong is the only reason that has
-- not deleted anyone's content.
--
-- So this migration installs those columns the boring way — `ALTER TABLE ADD
-- COLUMN`, which no dependent table can notice — along with the objects the
-- same backfill skipped. 053 and 116 are now documented no-ops so a fresh
-- bootstrap and production converge on this file instead of on each other.
--
-- NOT reconciled here, deliberately:
--   * `reserved_usernames.category` / `.notes` and 017's blocklist rows
--     (~200 names beyond the 104 production has) — needs its own rebuild and
--     a decision about the blocklist, not a silent add.
--   * `grove_messages.channel` — production's CHECK is narrower than history
--     ('landing'/'arbor' only); widening it needs a table rebuild.
--   * `platform_billing.plan` still defaults to 'free' for the same reason
--     (SQLite cannot alter a column default in place), and every insert names
--     a plan explicitly.

-- ---------------------------------------------------------------------------
-- tenants: the two columns 053 added and 116 tried to rebuild for
-- ---------------------------------------------------------------------------

-- Constant default, not (unixepoch()): ALTER TABLE rejects non-constant defaults.
ALTER TABLE tenants ADD COLUMN last_activity_at INTEGER DEFAULT 0;

-- null = no warning sent | 'first_warning' | 'final_warning' | 'reclaimed'
ALTER TABLE tenants ADD COLUMN reclamation_status TEXT;

-- Dropped by 116 on every fresh bootstrap, since it rebuilds the table and
-- only re-created five of the six indexes 053 installed.
CREATE INDEX IF NOT EXISTS idx_tenants_plan_activity
  ON tenants(plan, last_activity_at)
  WHERE plan = 'wanderer' AND active = 1;

-- ---------------------------------------------------------------------------
-- Reclaimed accounts — 053's table, also skipped by the backfill
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reclaimed_accounts (
  id TEXT PRIMARY KEY,
  original_tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  content_archive_key TEXT,
  reclaimed_at INTEGER NOT NULL,
  archive_expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_reclaimed_accounts_tenant
  ON reclaimed_accounts(original_tenant_id);

CREATE INDEX IF NOT EXISTS idx_reclaimed_accounts_archive_expires
  ON reclaimed_accounts(archive_expires_at);

-- ---------------------------------------------------------------------------
-- Indexes the ledger claims and production does not have
--
-- None are unique, so no data was ever at risk — these are lookup paths that
-- silently became scans. Every one is `IF NOT EXISTS`, so this file can be
-- applied to production, a fresh bootstrap, or a local database that already
-- has some of them.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_media_tenant_uploaded ON media(tenant_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_uploaded ON media(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_billing_plan ON platform_billing(plan);
CREATE INDEX IF NOT EXISTS idx_platform_billing_status ON platform_billing(status);
CREATE INDEX IF NOT EXISTS idx_platform_billing_provider
  ON platform_billing(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
