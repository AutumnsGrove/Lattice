-- Migration 123: Signup identity blocks
--
-- A small deny list checked at signup, keyed on normalized identity
-- (lowercased; everything after `+` in the local part removed). Created because
-- email verification only proves that someone can read the mailbox they signed
-- up with — agent mailboxes do exactly that, and plus aliases mean one operator
-- can hold many addresses that all land in one inbox.
--
-- Read by libs/engine/src/lib/server/security/signup-blocks.ts, enforced in
-- Heartwood at OTP send and user creation, and in Plant at tenant creation.
-- Managed with `gw block add|list|rm` — the list is data, not code.
--
-- NOTE ON APPLYING: d1_migrations claims 053 and 116 were applied when they were
-- not (see #1692), so do NOT rely on `wrangler d1 migrations apply` to run this.
-- Apply it explicitly:
--   npx wrangler d1 execute grove-engine-db --remote --file=libs/engine/migrations/123_signup_blocks.sql
-- The statements below are idempotent, so re-running is safe.

CREATE TABLE IF NOT EXISTS signup_blocks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('domain', 'email', 'substring')),
  -- Stored normalized: lowercase, and for 'email' also without a +alias.
  value TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  -- NULL = permanent. A temporary block should not become folklore.
  expires_at INTEGER,
  source TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_blocks_kind_value
  ON signup_blocks(kind, value);

CREATE INDEX IF NOT EXISTS idx_signup_blocks_expires
  ON signup_blocks(expires_at)
  WHERE expires_at IS NOT NULL;

-- The incident this table was built for (#1681). Two accounts, two hours apart,
-- one inbox: maplecrest+grace@ and maplecrest+ella@, both via email OTP.
-- A rule on the full address would have missed the second alias. The domain
-- rule catches the class.
INSERT OR IGNORE INTO signup_blocks (id, kind, value, reason, created_by, expires_at, source)
VALUES (
  lower(hex(randomblob(16))),
  'domain',
  'mail.grokbot.com',
  'Agent mailbox provider — accounts are created by software, not people',
  'autumn',
  NULL,
  'incident:2026-11-14'
);
