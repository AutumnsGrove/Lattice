-- Migration: Git Dashboard Token Support
-- Description: Add encrypted token column for per-tenant GitHub authentication
-- Date: 2026-01-21

-- =============================================================================
-- Add encrypted token column to git_dashboard_config
-- =============================================================================

-- Tokens are encrypted using AES-256-GCM before storage
-- Format: v1:base64(iv):base64(ciphertext)
-- See docs/security/token-encryption.md for details

ALTER TABLE git_dashboard_config
ADD COLUMN github_token_encrypted TEXT;

-- =============================================================================
-- Comments
-- =============================================================================

-- This migration adds per-tenant GitHub token storage.
-- Tokens are encrypted at rest using the TOKEN_ENCRYPTION_KEY env var.
--
-- Without a token:
-- - REST API: 60 requests/hour (unauthenticated)
-- - GraphQL API: Not available
--
-- With a token:
-- - REST API: 5000 requests/hour
-- - GraphQL API: Full access to contributions/stats
--
-- Tenants configure their token in the admin panel.
-- The token is encrypted before storage and decrypted only when making API calls.
