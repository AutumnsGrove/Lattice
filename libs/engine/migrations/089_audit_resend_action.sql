-- Migration: Add 'resend' to comped_invites_audit action CHECK constraint
-- SQLite cannot ALTER CHECK constraints, so we recreate the table

-- Step 1: Create new table with updated constraint
CREATE TABLE comped_invites_audit_new (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('create', 'revoke', 'use', 'resend')),
    invite_id TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    invite_type TEXT DEFAULT 'comped'
);

-- Step 2: Copy existing data
INSERT INTO comped_invites_audit_new
    SELECT id, action, invite_id, email, tier, actor_email, notes, created_at, invite_type
    FROM comped_invites_audit;

-- Step 3: Drop old table
DROP TABLE comped_invites_audit;

-- Step 4: Rename new table
ALTER TABLE comped_invites_audit_new RENAME TO comped_invites_audit;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_comped_invites_audit_created ON comped_invites_audit(created_at DESC);
