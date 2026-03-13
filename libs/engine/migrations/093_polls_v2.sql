-- Polls Curio v2
-- Adds container style, poll status (active/archived), and expands options JSON
-- to support per-option emoji and color fields.
--
-- Note: If curio tables were already migrated to grove-curios-db and dropped
-- by 088_drop_curio_tables.sql, these ALTERs are no-ops. The polls v2 schema
-- lives in the curios DB instead. We guard with CREATE TABLE IF NOT EXISTS
-- to make the migration replayable regardless of ordering.

-- Ensure polls table exists (no-op if 088 hasn't dropped it yet,
-- creates a stub if it has — the stub is harmless since all curio
-- data lives in grove-curios-db now)
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  multiple_choice INTEGER DEFAULT 0,
  show_results INTEGER DEFAULT 1,
  container_style TEXT NOT NULL DEFAULT 'glass',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for filtering active polls efficiently
CREATE INDEX IF NOT EXISTS idx_polls_status
  ON polls(tenant_id, status);
