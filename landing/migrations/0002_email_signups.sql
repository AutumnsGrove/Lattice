-- Email signups table for grove.place landing page
-- This migration adds the email signup functionality

CREATE TABLE IF NOT EXISTS email_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    unsubscribed_at TEXT,
    source TEXT DEFAULT 'landing'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS idx_email_signups_created ON email_signups(created_at);
