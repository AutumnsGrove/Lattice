-- Migration: Add invite_type to comped_invites
-- Distinguishes beta testers (Feb 7-14 launch) from permanently comped friends
-- Beta users get free access NOW but should convert to paid LATER
-- Comped users (like Madison) are free forever due to special circumstances

-- Add invite_type column to comped_invites
-- Values: 'comped' = free forever, 'beta' = beta tester (should convert later)
ALTER TABLE comped_invites ADD COLUMN invite_type TEXT NOT NULL DEFAULT 'comped'
  CHECK (invite_type IN ('comped', 'beta'));

-- Add invite_type to audit log for tracking
ALTER TABLE comped_invites_audit ADD COLUMN invite_type TEXT DEFAULT 'comped';

-- Index for filtering by type in admin dashboard
CREATE INDEX IF NOT EXISTS idx_comped_invites_type ON comped_invites(invite_type);
