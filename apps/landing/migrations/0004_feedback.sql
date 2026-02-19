-- Migration: Wanderer Feedback System
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=packages/landing/migrations/0004_feedback.sql --local
-- Run on production: wrangler d1 execute grove-engine-db --file=packages/landing/migrations/0004_feedback.sql --remote
--
-- This migration creates the feedback table for collecting feedback via web form and email.
-- Feedback is global (not tenant-scoped) - it's about the Grove platform itself.

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK(source IN ('web', 'email')),

    -- Sender info (all optional for anonymous submissions)
    name TEXT,
    email TEXT,

    -- Content
    subject TEXT,
    message TEXT NOT NULL,
    sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral', NULL)),

    -- Metadata for rate limiting and debugging
    ip_address TEXT,
    user_agent TEXT,

    -- Admin status tracking
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'archived')),
    read_at INTEGER,
    archived_at INTEGER,
    admin_notes TEXT,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_feedback_ip ON feedback(ip_address, created_at);
