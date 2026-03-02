-- Polls Curio v2
-- Adds container style, poll status (active/archived), and expands options JSON
-- to support per-option emoji and color fields.

-- Container style: glass (default), bulletin, minimal
ALTER TABLE polls ADD COLUMN container_style TEXT NOT NULL DEFAULT 'glass';

-- Poll status: active (default), archived
ALTER TABLE polls ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Index for filtering active polls efficiently
CREATE INDEX IF NOT EXISTS idx_polls_status
  ON polls(tenant_id, status);
