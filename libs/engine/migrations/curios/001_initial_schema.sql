-- grove-curios-db: Initial Schema
-- Compiled from engine migrations 024-074 (with 075, 084 ALTER TABLE incorporations)
-- All tenant FK references stripped (tenants table lives in grove-engine-db)
-- Internal curio-to-curio FKs preserved
-- 45 tables total

-- =============================================================================
-- Timeline Curio (024)
-- =============================================================================

CREATE TABLE IF NOT EXISTS timeline_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    github_username TEXT,
    github_token_encrypted TEXT,
    openrouter_key_encrypted TEXT,
    openrouter_model TEXT DEFAULT 'deepseek/deepseek-v3.2',
    voice_preset TEXT DEFAULT 'professional',
    custom_system_prompt TEXT,
    custom_summary_instructions TEXT,
    custom_gutter_style TEXT,
    repos_include TEXT,
    repos_exclude TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    owner_name TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS timeline_summaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    summary_date TEXT NOT NULL,
    brief_summary TEXT,
    detailed_timeline TEXT,
    gutter_content TEXT,
    commit_count INTEGER DEFAULT 0,
    repos_active TEXT,
    total_additions INTEGER DEFAULT 0,
    total_deletions INTEGER DEFAULT 0,
    ai_model TEXT,
    ai_cost REAL DEFAULT 0,
    voice_preset TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    is_rest_day INTEGER DEFAULT 0,
    rest_day_message TEXT,
    context_brief TEXT,
    detected_focus TEXT,
    continuation_of TEXT,
    focus_streak INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_timeline_summaries_tenant_date
ON timeline_summaries(tenant_id, summary_date DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_summaries_date
ON timeline_summaries(summary_date DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_summaries_context_lookup
ON timeline_summaries(tenant_id, summary_date DESC, context_brief);

CREATE TABLE IF NOT EXISTS timeline_activity (
    tenant_id TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    commit_count INTEGER DEFAULT 0,
    repos_active TEXT,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    activity_level INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (tenant_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_timeline_activity_date
ON timeline_activity(activity_date DESC);

CREATE TABLE IF NOT EXISTS timeline_ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    used_at INTEGER NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    request_count INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_timeline_ai_usage_tenant_date
ON timeline_ai_usage(tenant_id, used_at DESC);

-- =============================================================================
-- Journey Curio (025)
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    github_repo_url TEXT,
    github_token TEXT,
    openrouter_key TEXT,
    openrouter_model TEXT DEFAULT 'deepseek/deepseek-v3.2',
    snapshot_frequency TEXT DEFAULT 'release',
    show_language_chart INTEGER DEFAULT 1,
    show_growth_chart INTEGER DEFAULT 1,
    show_milestones INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'America/New_York',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS journey_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    label TEXT,
    git_hash TEXT,
    total_lines INTEGER,
    language_breakdown TEXT,
    doc_lines INTEGER,
    total_files INTEGER,
    directories INTEGER,
    total_commits INTEGER,
    commits_since_last INTEGER,
    test_files INTEGER,
    test_lines INTEGER,
    estimated_tokens INTEGER,
    bundle_size_kb INTEGER,
    ingestion_source TEXT DEFAULT 'manual',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, snapshot_date, label)
);

CREATE INDEX IF NOT EXISTS idx_journey_snapshots_tenant_date
ON journey_snapshots(tenant_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_journey_snapshots_label
ON journey_snapshots(tenant_id, label);

CREATE INDEX IF NOT EXISTS idx_journey_snapshots_created
ON journey_snapshots(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journey_summaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    version TEXT,
    summary_date TEXT,
    summary TEXT,
    highlights_features TEXT,
    highlights_fixes TEXT,
    stats_commits INTEGER,
    stats_features INTEGER,
    stats_fixes INTEGER,
    stats_refactoring INTEGER,
    stats_docs INTEGER,
    stats_tests INTEGER,
    stats_performance INTEGER,
    ai_model TEXT,
    ai_cost_usd REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (snapshot_id) REFERENCES journey_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journey_summaries_snapshot
ON journey_summaries(snapshot_id);

CREATE INDEX IF NOT EXISTS idx_journey_summaries_tenant_date
ON journey_summaries(tenant_id, summary_date DESC);

CREATE TABLE IF NOT EXISTS journey_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    job_type TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result_snapshot_id TEXT,
    error_message TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_journey_jobs_status
ON journey_jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_journey_jobs_created
ON journey_jobs(tenant_id, created_at DESC);

-- =============================================================================
-- Gallery Curio (031)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    r2_bucket TEXT,
    cdn_base_url TEXT,
    gallery_title TEXT,
    gallery_description TEXT,
    items_per_page INTEGER DEFAULT 30,
    sort_order TEXT DEFAULT 'date-desc',
    show_descriptions INTEGER DEFAULT 1,
    show_dates INTEGER DEFAULT 1,
    show_tags INTEGER DEFAULT 1,
    enable_lightbox INTEGER DEFAULT 1,
    enable_search INTEGER DEFAULT 1,
    enable_filters INTEGER DEFAULT 1,
    grid_style TEXT DEFAULT 'masonry',
    thumbnail_size TEXT DEFAULT 'medium',
    settings TEXT DEFAULT '{}',
    custom_css TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    parsed_date TEXT,
    parsed_category TEXT,
    parsed_slug TEXT,
    custom_title TEXT,
    custom_description TEXT,
    custom_date TEXT,
    alt_text TEXT,
    file_size INTEGER,
    uploaded_at TEXT,
    cdn_url TEXT,
    width INTEGER,
    height INTEGER,
    sort_index INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, r2_key)
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant
ON gallery_images(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant_date
ON gallery_images(tenant_id, COALESCE(custom_date, parsed_date) DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant_category
ON gallery_images(tenant_id, parsed_category);

CREATE INDEX IF NOT EXISTS idx_gallery_images_r2_key
ON gallery_images(tenant_id, r2_key);

CREATE INDEX IF NOT EXISTS idx_gallery_images_sort
ON gallery_images(tenant_id, sort_index DESC);

CREATE TABLE IF NOT EXISTS gallery_tags (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    color TEXT DEFAULT '#5cb85f',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_tenant
ON gallery_tags(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_slug
ON gallery_tags(tenant_id, slug);

CREATE TABLE IF NOT EXISTS gallery_image_tags (
    image_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES gallery_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_image_tags_image
ON gallery_image_tags(image_id);

CREATE INDEX IF NOT EXISTS idx_gallery_image_tags_tag
ON gallery_image_tags(tag_id);

CREATE TABLE IF NOT EXISTS gallery_collections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_id TEXT,
    display_order INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, slug),
    FOREIGN KEY (cover_image_id) REFERENCES gallery_images(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_collections_tenant
ON gallery_collections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_collections_slug
ON gallery_collections(tenant_id, slug);

CREATE TABLE IF NOT EXISTS gallery_collection_images (
    collection_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES gallery_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_collection_images_collection
ON gallery_collection_images(collection_id);

CREATE INDEX IF NOT EXISTS idx_gallery_collection_images_image
ON gallery_collection_images(image_id);

-- =============================================================================
-- Pulse Curio (056)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pulse_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    show_heatmap INTEGER DEFAULT 1,
    show_feed INTEGER DEFAULT 1,
    show_stats INTEGER DEFAULT 1,
    show_trends INTEGER DEFAULT 1,
    show_ci INTEGER DEFAULT 1,
    repos_include TEXT,
    repos_exclude TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    feed_max_items INTEGER DEFAULT 100,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS pulse_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    delivery_id TEXT,
    event_type TEXT NOT NULL,
    action TEXT,
    repo_name TEXT NOT NULL,
    repo_full_name TEXT NOT NULL,
    actor TEXT NOT NULL,
    title TEXT,
    ref TEXT,
    data TEXT,
    occurred_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_events_delivery
    ON pulse_events(tenant_id, delivery_id);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_time
    ON pulse_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_type
    ON pulse_events(tenant_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_repo
    ON pulse_events(tenant_id, repo_name, occurred_at DESC);

CREATE TABLE IF NOT EXISTS pulse_daily_stats (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date TEXT NOT NULL,
    repo_name TEXT,
    commits INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    prs_opened INTEGER DEFAULT 0,
    prs_merged INTEGER DEFAULT 0,
    prs_closed INTEGER DEFAULT 0,
    issues_opened INTEGER DEFAULT 0,
    issues_closed INTEGER DEFAULT 0,
    releases INTEGER DEFAULT 0,
    ci_passes INTEGER DEFAULT 0,
    ci_failures INTEGER DEFAULT 0,
    stars_total INTEGER,
    forks_total INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, date, repo_name)
);

CREATE INDEX IF NOT EXISTS idx_pulse_daily_tenant_date
    ON pulse_daily_stats(tenant_id, date DESC);

CREATE TABLE IF NOT EXISTS pulse_hourly_activity (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL,
    commits INTEGER DEFAULT 0,
    events INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_pulse_hourly_tenant_date
    ON pulse_hourly_activity(tenant_id, date DESC);

-- =============================================================================
-- Guestbook Curio (057)
-- =============================================================================

CREATE TABLE IF NOT EXISTS guestbook_config (
  tenant_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'cozy',
  entries_per_page INTEGER NOT NULL DEFAULT 20,
  require_approval INTEGER NOT NULL DEFAULT 1,
  allow_emoji INTEGER NOT NULL DEFAULT 1,
  max_message_length INTEGER NOT NULL DEFAULT 500,
  custom_prompt TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Anonymous Wanderer',
  message TEXT NOT NULL,
  emoji TEXT DEFAULT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_tenant
  ON guestbook_entries(tenant_id);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_approved
  ON guestbook_entries(tenant_id, approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_ip_hash
  ON guestbook_entries(tenant_id, ip_hash, created_at DESC);

-- =============================================================================
-- Hit Counter Curio (058 + 075 ALTER TABLE merged)
-- =============================================================================

CREATE TABLE IF NOT EXISTS hit_counters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  count INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'classic',
  label TEXT DEFAULT 'You are visitor',
  show_since_date INTEGER NOT NULL DEFAULT 1,
  count_mode TEXT NOT NULL DEFAULT 'every',
  since_date_style TEXT NOT NULL DEFAULT 'footnote',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, page_path)
);

CREATE INDEX IF NOT EXISTS idx_hit_counters_tenant
  ON hit_counters(tenant_id);

CREATE TABLE IF NOT EXISTS hit_counter_visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  visitor_hash TEXT NOT NULL,
  visited_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, page_path, visitor_hash, visited_date)
);

CREATE INDEX IF NOT EXISTS idx_hcv_lookup
  ON hit_counter_visitors(tenant_id, page_path, visitor_hash, visited_date);

CREATE INDEX IF NOT EXISTS idx_hcv_cleanup
  ON hit_counter_visitors(visited_date);

-- =============================================================================
-- Status Badge Curio (059)
-- =============================================================================

CREATE TABLE IF NOT EXISTS status_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'floating',
  animated INTEGER NOT NULL DEFAULT 1,
  custom_text TEXT DEFAULT NULL,
  show_date INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_status_badges_tenant
  ON status_badges(tenant_id);

-- =============================================================================
-- Activity Status Curio (060)
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_status (
  tenant_id TEXT PRIMARY KEY,
  status_text TEXT DEFAULT NULL,
  status_emoji TEXT DEFAULT NULL,
  status_type TEXT NOT NULL DEFAULT 'manual',
  preset TEXT DEFAULT NULL,
  auto_source TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Link Garden Curio (061)
-- =============================================================================

CREATE TABLE IF NOT EXISTS link_gardens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Links',
  description TEXT DEFAULT NULL,
  style TEXT NOT NULL DEFAULT 'list',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_link_gardens_tenant
  ON link_gardens(tenant_id);

CREATE TABLE IF NOT EXISTS link_garden_items (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  button_image_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (garden_id) REFERENCES link_gardens(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_garden_items_garden
  ON link_garden_items(garden_id);

CREATE INDEX IF NOT EXISTS idx_link_garden_items_tenant
  ON link_garden_items(tenant_id);

-- =============================================================================
-- Now Playing Curio (062)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nowplaying_config (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'manual',
  access_token_encrypted TEXT DEFAULT NULL,
  refresh_token_encrypted TEXT DEFAULT NULL,
  display_style TEXT NOT NULL DEFAULT 'compact',
  show_album_art INTEGER NOT NULL DEFAULT 1,
  show_progress INTEGER NOT NULL DEFAULT 0,
  fallback_text TEXT DEFAULT NULL,
  last_fm_username TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nowplaying_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT DEFAULT NULL,
  album_art_url TEXT DEFAULT NULL,
  played_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nowplaying_history_tenant
  ON nowplaying_history(tenant_id, played_at);

-- =============================================================================
-- Polls Curio (063)
-- =============================================================================

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  poll_type TEXT NOT NULL DEFAULT 'single',
  options TEXT NOT NULL DEFAULT '[]',
  results_visibility TEXT NOT NULL DEFAULT 'after-vote',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  close_date TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_polls_tenant
  ON polls(tenant_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  selected_options TEXT NOT NULL DEFAULT '[]',
  voted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
  ON poll_votes(poll_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique
  ON poll_votes(poll_id, voter_hash);

-- =============================================================================
-- Webring Curio (064)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webring_memberships (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ring_name TEXT NOT NULL,
  ring_url TEXT DEFAULT NULL,
  prev_url TEXT NOT NULL,
  next_url TEXT NOT NULL,
  home_url TEXT DEFAULT NULL,
  badge_style TEXT NOT NULL DEFAULT 'classic',
  position TEXT NOT NULL DEFAULT 'footer',
  sort_order INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webring_memberships_tenant
  ON webring_memberships(tenant_id);

-- =============================================================================
-- Artifacts Curio (065)
-- =============================================================================

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'right-vine',
  config TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_artifacts_tenant ON artifacts(tenant_id);

-- =============================================================================
-- Cursor Curio (066)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cursor_config (
  tenant_id TEXT PRIMARY KEY,
  cursor_type TEXT NOT NULL DEFAULT 'preset',
  preset TEXT DEFAULT 'leaf',
  custom_url TEXT DEFAULT NULL,
  trail_enabled INTEGER NOT NULL DEFAULT 0,
  trail_effect TEXT DEFAULT 'sparkle',
  trail_length INTEGER NOT NULL DEFAULT 8,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Mood Ring Curio (067 + 084 ALTER TABLE merged)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mood_ring_config (
  tenant_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'time',
  manual_mood TEXT DEFAULT NULL,
  manual_color TEXT DEFAULT NULL,
  color_scheme TEXT NOT NULL DEFAULT 'default',
  display_style TEXT NOT NULL DEFAULT 'ring',
  show_mood_log INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mood_ring_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  mood TEXT NOT NULL,
  color TEXT NOT NULL,
  note TEXT DEFAULT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mood_ring_log_tenant ON mood_ring_log(tenant_id, logged_at);

-- =============================================================================
-- Blogroll Curio (068)
-- =============================================================================

CREATE TABLE IF NOT EXISTS blogroll_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  feed_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  last_post_title TEXT DEFAULT NULL,
  last_post_url TEXT DEFAULT NULL,
  last_post_date TEXT DEFAULT NULL,
  last_feed_check TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blogroll_items_tenant ON blogroll_items(tenant_id);

-- =============================================================================
-- Badges Curio (069)
-- =============================================================================

CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'achievement',
  rarity TEXT NOT NULL DEFAULT 'common',
  auto_criteria TEXT DEFAULT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_showcased INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (badge_id) REFERENCES badge_definitions(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, badge_id)
);

CREATE TABLE IF NOT EXISTS custom_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tenant_badges_tenant ON tenant_badges(tenant_id);
CREATE INDEX idx_tenant_badges_showcased ON tenant_badges(tenant_id, is_showcased);

-- =============================================================================
-- Ambient Curio (070)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ambient_config (
  tenant_id TEXT PRIMARY KEY,
  sound_set TEXT NOT NULL DEFAULT 'forest-rain',
  volume INTEGER NOT NULL DEFAULT 30,
  enabled INTEGER NOT NULL DEFAULT 0,
  custom_url TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Bookmark Shelf Curio (071)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookmark_shelves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  shelf_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  cover_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  is_currently_reading INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shelf_id) REFERENCES bookmark_shelves(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmark_shelves_tenant ON bookmark_shelves(tenant_id);
CREATE INDEX idx_bookmarks_shelf ON bookmarks(shelf_id);
CREATE INDEX idx_bookmarks_tenant ON bookmarks(tenant_id);

-- =============================================================================
-- Shrines Curio (072)
-- =============================================================================

CREATE TABLE IF NOT EXISTS shrines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  shrine_type TEXT NOT NULL DEFAULT 'blank',
  description TEXT DEFAULT NULL,
  size TEXT NOT NULL DEFAULT 'medium',
  frame_style TEXT NOT NULL DEFAULT 'minimal',
  contents TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shrines_tenant ON shrines(tenant_id);

-- =============================================================================
-- Clipart Curio (073)
-- =============================================================================

CREATE TABLE IF NOT EXISTS clipart_placements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  x_position REAL NOT NULL DEFAULT 50,
  y_position REAL NOT NULL DEFAULT 50,
  scale REAL NOT NULL DEFAULT 1.0,
  rotation REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_clipart_placements_tenant ON clipart_placements(tenant_id, page_path);

-- =============================================================================
-- Custom Uploads Curio (074)
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_uploads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  r2_key TEXT NOT NULL,
  thumbnail_r2_key TEXT DEFAULT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_custom_uploads_tenant ON custom_uploads(tenant_id);
