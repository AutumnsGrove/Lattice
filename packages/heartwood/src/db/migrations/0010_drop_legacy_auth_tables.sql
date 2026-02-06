-- Migration: Drop legacy authentication tables
-- Date: 2026-01-29
-- Description: Remove legacy OAuth/magic link tables after Better Auth migration is verified
--
-- IMPORTANT: Only run this migration AFTER verifying Better Auth works in production.
-- Wait 24-48 hours after deploying the server-side changes before running this.
--
-- These tables are no longer needed because:
-- - oauth_states: Legacy PKCE state storage, Better Auth handles OAuth state internally
-- - auth_codes: Legacy authorization codes for token exchange, Better Auth uses its own session system
-- - magic_codes: Legacy 6-digit email codes, Better Auth has built-in magic link plugin
--
-- The device_codes table is KEPT because Better Auth doesn't support RFC 8628 (Device Authorization Grant).
-- The refresh_tokens table is KEPT in case device code flow still references it.

-- Drop legacy OAuth state storage
DROP TABLE IF EXISTS oauth_states;

-- Drop legacy authorization codes
DROP TABLE IF EXISTS auth_codes;

-- Drop legacy magic link codes
DROP TABLE IF EXISTS magic_codes;
