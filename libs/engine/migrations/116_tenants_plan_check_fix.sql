-- Migration 116: widen the tenants.plan CHECK so a fresh database can create a
-- Wanderer — and nothing else. Must never run against a database with rows.
--
-- Two separate problems got braided together here, and they need separating:
--
--   1. A fresh bootstrap's `tenants.plan` CHECK omits 'wanderer' (it comes
--      from 009/013), so `createTenant()` fails on a from-scratch database at
--      step 1 with SQLITE_CONSTRAINT_CHECK. Only a table rebuild can widen a
--      CHECK, and this is that rebuild. It is needed, and it is needed here,
--      because 124 runs after it.
--
--   2. Production is missing `last_activity_at` and `reclamation_status`,
--      because the ledger row for 053 is a backfill entry, not a record of
--      anything having run (#1692). That repair is NOT this file's job any
--      more: 124 owns those two columns with a plain ALTER TABLE, which is
--      the only form no dependent table can notice.
--
-- Hence the CREATE TABLE below has fifteen columns, not seventeen. The two
-- columns 053 also claims are deliberately absent — 124 adds them straight
-- after, on both a fresh bootstrap and production. Wiring them in here as
-- well would make 124 collide with them on every fresh database.
--
--    DANGER: do not run this against a database that has data in it.
--
-- D1 enforces foreign keys, so `DROP TABLE tenants` performs an implicit
-- `DELETE FROM tenants`, and the ON DELETE CASCADE clauses on the 30 foreign
-- keys pointing at `tenants` fire before the rename ever happens. Reproduced
-- 2026-11-21 against a copy of production's schema with one tenant, one post
-- and one user: the post was gone afterwards, the user's tenant_id was nulled,
-- and the swap reported success.
--
-- Production never runs it: `d1_migrations` has a row for this file
-- (2026-08-26 17:56:22, alongside 117), so `wrangler d1 migrations apply`
-- skips it there — and production's CHECK already includes 'wanderer', so
-- nothing is owed. The only execution path is a fresh bootstrap, where the
-- table is empty of anything anyone cares about.
--
-- Superseded no-op: 111_tenants_plan_add_wanderer.sql

CREATE TABLE tenants_new (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,

  plan TEXT DEFAULT 'seedling' CHECK (plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  custom_domain TEXT,

  theme TEXT DEFAULT 'default',
  accent_color TEXT,

  active INTEGER DEFAULT 1,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  encrypted_dek TEXT, meadow_opt_in INTEGER DEFAULT 0
);

-- Explicit column list, NOT `SELECT *`: a database that has been through 124
-- before reaching here is not a shape this file sees, but naming every column
-- keeps that impossibility obvious rather than relying on column order.
INSERT INTO tenants_new (
  id, subdomain, display_name, email, plan, storage_used, post_count,
  custom_domain, theme, accent_color, active, created_at, updated_at,
  encrypted_dek, meadow_opt_in
)
SELECT
  id, subdomain, display_name, email, plan, storage_used, post_count,
  custom_domain, theme, accent_color, active, created_at, updated_at,
  encrypted_dek, meadow_opt_in
FROM tenants;

DROP TABLE tenants;

ALTER TABLE tenants_new RENAME TO tenants;

-- The five indexes that do not depend on a column 124 adds. The sixth,
-- idx_tenants_plan_activity, needs last_activity_at and so is created by 124.
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_plan ON tenants(plan);
