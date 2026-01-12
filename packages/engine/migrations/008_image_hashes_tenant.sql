-- Add tenant_id column to image_hashes table
-- This fixes cross-tenant image URL exposure via duplicate detection
-- Issue: CRIT-05 - Cross-tenant data exposure through image hashes
--
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/008_image_hashes_tenant.sql --remote

-- Step 1: Add column (nullable to handle existing rows)
ALTER TABLE image_hashes ADD COLUMN tenant_id TEXT;

-- Step 2: Drop old hash-only index and create unique composite index
-- The unique index serves both query optimization AND constraint enforcement
-- (A separate non-unique index would be redundant)
DROP INDEX IF EXISTS idx_image_hashes_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_hashes_tenant_hash ON image_hashes(tenant_id, hash);

-- Note: Existing rows will have NULL tenant_id
-- They will be naturally replaced on re-upload with proper tenant_id values
