-- Add updated_at column to storage_exports
-- The ExportDO writes this column during phase transitions so the status
-- endpoint can detect stale exports (DO evictions, crashes, etc.).
-- Without this column, all D1 UPDATEs in ExportDO fail with "no such column",
-- which is the root cause of exports stuck at 0%.

ALTER TABLE storage_exports ADD COLUMN updated_at INTEGER;

-- Backfill existing rows: use created_at as the initial updated_at value
UPDATE storage_exports SET updated_at = created_at WHERE updated_at IS NULL;
