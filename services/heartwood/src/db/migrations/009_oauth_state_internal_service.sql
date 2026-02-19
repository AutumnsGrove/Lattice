-- Add is_internal_service flag to oauth_states table
-- This caches the client's is_internal_service flag during OAuth initiation
-- to avoid re-fetching the client in the callback handler

ALTER TABLE oauth_states ADD COLUMN is_internal_service INTEGER DEFAULT 0;
