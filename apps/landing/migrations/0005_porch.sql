-- Migration: Porch Support Conversations
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=packages/landing/migrations/0005_porch.sql --local
-- Run on production: wrangler d1 execute grove-engine-db --file=packages/landing/migrations/0005_porch.sql --remote
--
-- Porch is Grove's warm, human-centered support system.
-- "Have a seat on the porch. We'll figure it out together."

-- Enable foreign key constraint enforcement (required for ON DELETE CASCADE)
PRAGMA foreign_keys = ON;

-- Visit numbering sequence (stored in KV, but we need a fallback)
-- Format: PORCH-2026-00001

CREATE TABLE IF NOT EXISTS porch_visits (
    id TEXT PRIMARY KEY,
    visit_number TEXT UNIQUE NOT NULL,

    -- Visitor info
    user_id TEXT,                          -- Heartwood user ID (if authenticated)
    guest_email TEXT,                      -- Email for guests
    guest_name TEXT,                       -- Optional name

    -- Visit details
    category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('billing', 'technical', 'account', 'hello', 'other')),
    subject TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'pending', 'resolved')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'urgent')),

    -- Admin notes (internal, not shown to user)
    admin_notes TEXT,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    resolved_at INTEGER,
    resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS porch_messages (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES porch_visits(id) ON DELETE CASCADE,

    -- Sender info
    sender_type TEXT NOT NULL CHECK(sender_type IN ('visitor', 'autumn')),
    sender_name TEXT,                      -- Display name for the message

    -- Content
    content TEXT NOT NULL,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_porch_visits_user ON porch_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_porch_visits_email ON porch_visits(guest_email);
CREATE INDEX IF NOT EXISTS idx_porch_visits_status ON porch_visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_porch_visits_created ON porch_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_porch_visits_number ON porch_visits(visit_number);

CREATE INDEX IF NOT EXISTS idx_porch_messages_visit ON porch_messages(visit_id, created_at ASC);
