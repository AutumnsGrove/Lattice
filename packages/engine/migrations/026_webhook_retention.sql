-- Migration: Webhook Retention
-- Description: Add expires_at column for automatic webhook cleanup (120-day retention)
-- Date: 2026-01-18

-- =============================================================================
-- DESIGN DECISION: Automatic Webhook Expiration
-- =============================================================================
--
-- Webhook payloads are now sanitized before storage (PII stripped), and we add
-- an expires_at column for automatic cleanup via scheduled cron job.
--
-- Retention policy: 120 days
-- - Long enough to debug payment issues and investigate disputes
-- - Short enough to comply with data minimization principles (GDPR)
-- - Matches typical chargeback window (usually 90-120 days)
--
-- The expires_at column stores a Unix timestamp. Expired webhooks are cleaned
-- up by a daily cron job at /api/cron/cleanup-webhooks.
--
-- =============================================================================

-- Add expires_at column to webhook_events table
-- Default: NULL (existing rows won't have expiry, will be grandfathered)
-- New rows: Set by application code to current_time + 120 days
ALTER TABLE webhook_events ADD COLUMN expires_at INTEGER;

-- Index for efficient cleanup queries
-- The cron job will query: WHERE expires_at IS NOT NULL AND expires_at < ?
CREATE INDEX IF NOT EXISTS idx_webhook_events_expires_at
ON webhook_events(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- Backfill Strategy (Optional)
-- =============================================================================
--
-- For existing webhooks, we can optionally backfill expires_at based on created_at.
-- This is commented out by default - uncomment if you want to clean up old data.
--
-- UPDATE webhook_events
-- SET expires_at = created_at + (120 * 24 * 60 * 60)
-- WHERE expires_at IS NULL AND created_at IS NOT NULL;
--
-- =============================================================================

-- =============================================================================
-- Comments
-- =============================================================================
--
-- Security improvements in this release:
--
-- 1. PII SANITIZATION: Webhook payloads are now sanitized before storage.
--    Stripped fields include: user_email, user_name, card_brand, card_last_four,
--    billing_address, and other personal data.
--
-- 2. RETENTION LIMITS: The expires_at column enables automatic cleanup of old
--    webhook data. A cron job runs daily to delete expired records.
--
-- 3. MINIMAL DATA: Combined, these changes reduce the blast radius of a potential
--    data breach by ensuring we store only essential, non-PII data for a limited
--    time period.
--
-- =============================================================================
