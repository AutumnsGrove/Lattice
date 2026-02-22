-- Drop all 45 curio tables from grove-engine-db
-- Data now lives in grove-curios-db
-- Drop order: children before parents (FK constraints)

-- Timeline
DROP TABLE IF EXISTS timeline_ai_usage;
DROP TABLE IF EXISTS timeline_activity;
DROP TABLE IF EXISTS timeline_summaries;
DROP TABLE IF EXISTS timeline_curio_config;

-- Journey
DROP TABLE IF EXISTS journey_jobs;
DROP TABLE IF EXISTS journey_summaries;
DROP TABLE IF EXISTS journey_snapshots;
DROP TABLE IF EXISTS journey_curio_config;

-- Gallery
DROP TABLE IF EXISTS gallery_collection_images;
DROP TABLE IF EXISTS gallery_image_tags;
DROP TABLE IF EXISTS gallery_collections;
DROP TABLE IF EXISTS gallery_tags;
DROP TABLE IF EXISTS gallery_images;
DROP TABLE IF EXISTS gallery_curio_config;

-- Pulse
DROP TABLE IF EXISTS pulse_hourly_activity;
DROP TABLE IF EXISTS pulse_daily_stats;
DROP TABLE IF EXISTS pulse_events;
DROP TABLE IF EXISTS pulse_curio_config;

-- Guestbook
DROP TABLE IF EXISTS guestbook_entries;
DROP TABLE IF EXISTS guestbook_config;

-- Hit Counter
DROP TABLE IF EXISTS hit_counter_visitors;
DROP TABLE IF EXISTS hit_counters;

-- Polls
DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS polls;

-- Link Garden
DROP TABLE IF EXISTS link_garden_items;
DROP TABLE IF EXISTS link_gardens;

-- Bookmark Shelf
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS bookmark_shelves;

-- Shrines
DROP TABLE IF EXISTS shrines;

-- Mood Ring
DROP TABLE IF EXISTS mood_ring_log;
DROP TABLE IF EXISTS mood_ring_config;

-- Badges
DROP TABLE IF EXISTS custom_badges;
DROP TABLE IF EXISTS tenant_badges;
DROP TABLE IF EXISTS badge_definitions;

-- Now Playing
DROP TABLE IF EXISTS nowplaying_history;
DROP TABLE IF EXISTS nowplaying_config;

-- Simple curios (no child tables)
DROP TABLE IF EXISTS status_badges;
DROP TABLE IF EXISTS activity_status;
DROP TABLE IF EXISTS webring_memberships;
DROP TABLE IF EXISTS artifacts;
DROP TABLE IF EXISTS cursor_config;
DROP TABLE IF EXISTS blogroll_items;
DROP TABLE IF EXISTS ambient_config;
DROP TABLE IF EXISTS clipart_placements;
DROP TABLE IF EXISTS custom_uploads;
