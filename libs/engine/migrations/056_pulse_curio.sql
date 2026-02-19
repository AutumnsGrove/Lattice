-- =============================================================================
-- Pulse Curio — Live development heartbeat from GitHub webhooks
-- =============================================================================
-- Migration 056: Create Pulse curio tables
--
-- Tables:
--   pulse_curio_config     — Per-tenant configuration
--   pulse_events           — Normalized webhook events (90-day retention)
--   pulse_daily_stats      — Aggregated daily metrics (indefinite)
--   pulse_hourly_activity  — Heatmap data (90-day retention)
-- =============================================================================

-- Per-tenant Pulse configuration
CREATE TABLE IF NOT EXISTS pulse_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    -- Display preferences
    show_heatmap INTEGER DEFAULT 1,
    show_feed INTEGER DEFAULT 1,
    show_stats INTEGER DEFAULT 1,
    show_trends INTEGER DEFAULT 1,
    show_ci INTEGER DEFAULT 1,
    -- Filtering
    repos_include TEXT,                -- JSON array: only these repos (null = all)
    repos_exclude TEXT,                -- JSON array: ignore these repos
    -- Settings
    timezone TEXT DEFAULT 'America/New_York',
    feed_max_items INTEGER DEFAULT 100,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Normalized webhook events
CREATE TABLE IF NOT EXISTS pulse_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    delivery_id TEXT,                  -- GitHub X-GitHub-Delivery (idempotency)
    event_type TEXT NOT NULL,          -- push, pull_request, issues, release, etc.
    action TEXT,                       -- opened, closed, merged, created, etc.
    repo_name TEXT NOT NULL,           -- Short name (e.g., "GroveEngine")
    repo_full_name TEXT NOT NULL,      -- Full name (e.g., "AutumnsGrove/GroveEngine")
    actor TEXT NOT NULL,               -- GitHub username
    title TEXT,                        -- Commit message / PR title / issue title
    ref TEXT,                          -- Branch name or tag
    data TEXT,                         -- JSON: event-specific normalized details
    occurred_at INTEGER NOT NULL,      -- Event timestamp (unix seconds)
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_events_delivery
    ON pulse_events(tenant_id, delivery_id);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_time
    ON pulse_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_type
    ON pulse_events(tenant_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_repo
    ON pulse_events(tenant_id, repo_name, occurred_at DESC);

-- Aggregated daily metrics
CREATE TABLE IF NOT EXISTS pulse_daily_stats (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    repo_name TEXT,                    -- NULL = all repos combined
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
    UNIQUE(tenant_id, date, repo_name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pulse_daily_tenant_date
    ON pulse_daily_stats(tenant_id, date DESC);

-- Hourly activity for heatmap
CREATE TABLE IF NOT EXISTS pulse_hourly_activity (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    hour INTEGER NOT NULL,            -- 0-23 (UTC)
    commits INTEGER DEFAULT 0,
    events INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, date, hour),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pulse_hourly_tenant_date
    ON pulse_hourly_activity(tenant_id, date DESC);
