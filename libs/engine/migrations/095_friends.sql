-- ============================================================================
-- FRIENDS: DECOUPLE FROM LANTERN
-- ============================================================================
-- Renames lantern_friends → friends to reflect that friend connections are a
-- first-class tenant concept, not a Lantern-specific feature.
--
-- SQLite ALTER TABLE RENAME is atomic and preserves data, unique constraints,
-- and schema. The index name doesn't auto-rename, so we drop+recreate.
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/XXX
-- ============================================================================

ALTER TABLE lantern_friends RENAME TO friends;

DROP INDEX IF EXISTS idx_lantern_friends_tenant;
CREATE INDEX IF NOT EXISTS idx_friends_tenant ON friends (tenant_id);
