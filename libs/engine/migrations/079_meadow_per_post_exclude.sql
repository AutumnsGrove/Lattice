-- Per-post Meadow exclusion
-- Default 0 = shared in Meadow feed, 1 = excluded
-- Filtering happens in the RSS feed query (api/feed), not the poller
ALTER TABLE posts ADD COLUMN meadow_exclude INTEGER DEFAULT 0;
