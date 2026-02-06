-- Migration 045: Add invite tokens for email links
--
-- Adds a secure token to comped_invites so we can generate
-- unique invite links that pre-fill the user's email on plant.
-- Also tracks when the invite email was sent.

ALTER TABLE comped_invites ADD COLUMN invite_token TEXT UNIQUE;
ALTER TABLE comped_invites ADD COLUMN email_sent_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_comped_invites_token ON comped_invites(invite_token);
