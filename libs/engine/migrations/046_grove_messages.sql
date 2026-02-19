-- Grove Messages: Beta communication system
-- Allows Autumn to push announcements to landing page and arbor admin panel

CREATE TABLE IF NOT EXISTS grove_messages (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('landing', 'arbor')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info' CHECK(message_type IN ('info', 'warning', 'celebration', 'update')),
  pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,              -- ISO timestamp, NULL = never
  created_by TEXT NOT NULL,     -- email
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grove_messages_channel_published
  ON grove_messages(channel, published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grove_messages_expires
  ON grove_messages(expires_at) WHERE expires_at IS NOT NULL;
