-- Expand grove_messages channels to support Plant, Meadow, and Clearing
-- SQLite doesn't support ALTER CHECK constraints, so we recreate the table

CREATE TABLE grove_messages_new (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('landing', 'arbor', 'plant', 'meadow', 'clearing')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info'
    CHECK(message_type IN ('info', 'warning', 'celebration', 'update')),
  pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO grove_messages_new SELECT * FROM grove_messages;
DROP TABLE grove_messages;
ALTER TABLE grove_messages_new RENAME TO grove_messages;

-- Recreate indexes
CREATE INDEX idx_grove_messages_channel_published
  ON grove_messages(channel, published, created_at DESC);
CREATE INDEX idx_grove_messages_expires
  ON grove_messages(expires_at) WHERE expires_at IS NOT NULL;
