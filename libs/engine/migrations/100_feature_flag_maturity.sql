-- Add maturity lifecycle column to feature flags
-- Replaces the convention of deriving category from flag ID prefixes
-- Values: experimental, beta, stable, graduated
ALTER TABLE feature_flags ADD COLUMN maturity TEXT NOT NULL DEFAULT 'experimental';

-- Backfill existing flags based on current state
-- greenhouse_only=0 flags that are enabled are stable
UPDATE feature_flags SET maturity = 'stable' WHERE greenhouse_only = 0 AND enabled = 1;

-- greenhouse_only=1 flags start as experimental
UPDATE feature_flags SET maturity = 'experimental' WHERE greenhouse_only = 1;

-- Deprecated/superseded flags get graduated (done, kept for reference)
UPDATE feature_flags SET maturity = 'graduated' WHERE id = 'photo_gallery';
UPDATE feature_flags SET maturity = 'graduated' WHERE id = 'image_uploads_enabled';

-- Index for filtering by maturity (used by article generator and admin UI)
CREATE INDEX IF NOT EXISTS idx_flags_maturity ON feature_flags(maturity);
