-- Shutter Offenders Table
-- Tracks domains where prompt injection has been detected

CREATE TABLE IF NOT EXISTS offenders (
  domain TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  detection_count INTEGER NOT NULL DEFAULT 1,
  injection_types TEXT NOT NULL,  -- JSON array of detected injection types
  avg_confidence REAL NOT NULL DEFAULT 0.0,
  max_confidence REAL NOT NULL DEFAULT 0.0
);

-- Index for listing offenders by detection count
CREATE INDEX IF NOT EXISTS idx_offenders_count ON offenders(detection_count DESC);

-- Index for confidence-based lookups
CREATE INDEX IF NOT EXISTS idx_offenders_confidence ON offenders(max_confidence DESC);
