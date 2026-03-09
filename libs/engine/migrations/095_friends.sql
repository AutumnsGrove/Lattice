-- ============================================================================
-- FRIENDS: DECOUPLE FROM LANTERN
-- ============================================================================
-- Renames lantern_friends → friends to reflect that friend connections are a
-- first-class tenant concept, not a Lantern-specific feature.
--
-- SQLite ALTER TABLE RENAME is atomic and preserves data, unique constraints,
-- and schema. The index name doesn't auto-rename, so we drop+recreate.
--
-- Idempotent: if friends already exists (rename was applied manually or via
-- a previous partial run), we skip the rename and just ensure the index.
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/XXX
-- ============================================================================

-- Ensure friends table exists — covers both cases:
--   1. lantern_friends was already renamed → this is a no-op
--   2. Neither table exists → creates it fresh
CREATE TABLE IF NOT EXISTS friends (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id         TEXT NOT NULL,
    friend_tenant_id  TEXT NOT NULL,
    friend_name       TEXT NOT NULL,
    friend_subdomain  TEXT NOT NULL,
    source            TEXT NOT NULL DEFAULT 'manual',
    added_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, friend_tenant_id)
);

-- Clean up old index name if it exists
DROP INDEX IF EXISTS idx_lantern_friends_tenant;
CREATE INDEX IF NOT EXISTS idx_friends_tenant ON friends (tenant_id);
