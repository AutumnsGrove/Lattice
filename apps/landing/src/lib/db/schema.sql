-- Email signups table for grove.place landing page
-- Run this with: wrangler d1 execute grove-engine-db --file=src/lib/db/schema.sql

CREATE TABLE IF NOT EXISTS email_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    unsubscribed_at TEXT,
    source TEXT DEFAULT 'landing',
    -- Onboarding email tracking
    welcome_email_sent INTEGER DEFAULT 0,
    day3_email_sent INTEGER DEFAULT 0,
    day7_email_sent INTEGER DEFAULT 0,
    day14_email_sent INTEGER DEFAULT 0,
    onboarding_emails_unsubscribed INTEGER DEFAULT 0
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS idx_email_signups_created ON email_signups(created_at);

-- Index for efficient querying of pending onboarding emails
CREATE INDEX IF NOT EXISTS idx_email_signups_onboarding ON email_signups(
  created_at,
  onboarding_emails_unsubscribed
) WHERE unsubscribed_at IS NULL;
