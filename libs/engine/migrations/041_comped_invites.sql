-- Migration: Comped Invites System
-- Allows admins to pre-comp users by email before they sign up
-- When a comped user signs up, they skip payment and get their tier directly

-- Comped invites table
CREATE TABLE IF NOT EXISTS comped_invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    tier TEXT NOT NULL CHECK (tier IN ('seedling', 'sapling', 'oak', 'evergreen')),
    custom_message TEXT,
    invited_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    used_at INTEGER,
    used_by_tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL
);

-- Index for quick email lookup during signup
CREATE INDEX IF NOT EXISTS idx_comped_invites_email ON comped_invites(email);

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_comped_invites_created ON comped_invites(created_at DESC);

-- Audit log for comped invite actions
CREATE TABLE IF NOT EXISTS comped_invites_audit (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('create', 'revoke', 'use')),
    invite_id TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_comped_invites_audit_created ON comped_invites_audit(created_at DESC);
