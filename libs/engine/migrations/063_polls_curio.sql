-- Polls Curio
-- Run interactive polls on your site with live results.
-- Low friction — vote without logging in.

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  poll_type TEXT NOT NULL DEFAULT 'single',
  options TEXT NOT NULL DEFAULT '[]',
  results_visibility TEXT NOT NULL DEFAULT 'after-vote',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  close_date TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_polls_tenant
  ON polls(tenant_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  selected_options TEXT NOT NULL DEFAULT '[]',
  voted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
  ON poll_votes(poll_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique
  ON poll_votes(poll_id, voter_hash);
