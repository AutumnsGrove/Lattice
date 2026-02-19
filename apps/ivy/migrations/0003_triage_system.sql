-- Ivy Triage System
-- Adds AI classification, filter rules, digest tracking, and digest settings

-- Classification columns on existing ivy_emails table
ALTER TABLE ivy_emails ADD COLUMN category TEXT DEFAULT 'uncategorized';
ALTER TABLE ivy_emails ADD COLUMN confidence REAL DEFAULT 0;
ALTER TABLE ivy_emails ADD COLUMN suggested_action TEXT DEFAULT 'read';
ALTER TABLE ivy_emails ADD COLUMN topics TEXT DEFAULT '[]';
ALTER TABLE ivy_emails ADD COLUMN classification_model TEXT;
ALTER TABLE ivy_emails ADD COLUMN classified_at TEXT;
ALTER TABLE ivy_emails ADD COLUMN is_read INTEGER DEFAULT 0;
ALTER TABLE ivy_emails ADD COLUMN original_sender TEXT;

-- Triage filter rules (blocklist/allowlist)
CREATE TABLE IF NOT EXISTS ivy_triage_filters (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digest tracking
CREATE TABLE IF NOT EXISTS ivy_digest_log (
  id TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL,
  recipient TEXT NOT NULL,
  email_count INTEGER NOT NULL,
  categories TEXT NOT NULL,
  zephyr_message_id TEXT,
  digest_type TEXT DEFAULT 'scheduled',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digest settings on existing ivy_settings table
ALTER TABLE ivy_settings ADD COLUMN digest_times TEXT DEFAULT '["08:00","13:00","18:00"]';
ALTER TABLE ivy_settings ADD COLUMN digest_timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE ivy_settings ADD COLUMN digest_recipient TEXT;
ALTER TABLE ivy_settings ADD COLUMN digest_enabled INTEGER DEFAULT 0;
ALTER TABLE ivy_settings ADD COLUMN last_digest_at TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_category ON ivy_emails(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sender ON ivy_emails(original_sender);
CREATE INDEX IF NOT EXISTS idx_emails_read ON ivy_emails(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_sent ON ivy_digest_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_filters_type ON ivy_triage_filters(type);
