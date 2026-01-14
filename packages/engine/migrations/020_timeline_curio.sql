-- Migration: Timeline Curio
-- Description: Add tables for Timeline Curio (AI-powered daily summaries)
-- Date: 2026-01-14

-- =============================================================================
-- Timeline Curio Configuration (per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS timeline_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    github_username TEXT,
    github_token_encrypted TEXT,      -- Encrypted at rest
    openrouter_key_encrypted TEXT,    -- Encrypted at rest
    openrouter_model TEXT DEFAULT 'anthropic/claude-3.5-haiku',
    voice_preset TEXT DEFAULT 'professional',
    custom_system_prompt TEXT,        -- NULL unless voice_preset = 'custom'
    custom_summary_instructions TEXT, -- Additional instructions for summary style
    custom_gutter_style TEXT,         -- Instructions for gutter comments
    repos_include TEXT,               -- JSON array, NULL = all repos
    repos_exclude TEXT,               -- JSON array of repos to skip
    timezone TEXT DEFAULT 'America/New_York',
    owner_name TEXT,                  -- Display name for summaries
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- Timeline Summaries (multi-tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS timeline_summaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    summary_date TEXT NOT NULL,       -- YYYY-MM-DD format
    brief_summary TEXT,               -- 2-3 sentence summary
    detailed_timeline TEXT,           -- Full markdown breakdown
    gutter_content TEXT,              -- JSON array of gutter comments
    commit_count INTEGER DEFAULT 0,
    repos_active TEXT,                -- JSON array of repo names
    total_additions INTEGER DEFAULT 0,
    total_deletions INTEGER DEFAULT 0,
    ai_model TEXT,                    -- "provider:model" used
    ai_cost REAL DEFAULT 0,           -- Cost in USD
    voice_preset TEXT,                -- Voice preset used
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    generation_time_ms INTEGER,       -- How long generation took
    is_rest_day INTEGER DEFAULT 0,    -- 1 if no commits
    rest_day_message TEXT,            -- Fun message for rest days
    -- Long-horizon context columns (added for multi-day task awareness)
    context_brief TEXT,               -- JSON: { date, mainFocus, repos[], linesChanged, commitCount, detectedTask }
    detected_focus TEXT,              -- JSON: { task, startDate, repos[] }
    continuation_of TEXT,             -- Date string if continuing multi-day task, NULL otherwise
    focus_streak INTEGER DEFAULT 0,   -- Consecutive days on same task type (1 = single day)
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(tenant_id, summary_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_timeline_summaries_tenant_date
ON timeline_summaries(tenant_id, summary_date DESC);

-- Index for finding summaries by date range
CREATE INDEX IF NOT EXISTS idx_timeline_summaries_date
ON timeline_summaries(summary_date DESC);

-- Index for historical context lookup (used by long-horizon context system)
CREATE INDEX IF NOT EXISTS idx_timeline_summaries_context_lookup
ON timeline_summaries(tenant_id, summary_date DESC, context_brief);

-- =============================================================================
-- Timeline Activity Cache (for heatmap)
-- =============================================================================

CREATE TABLE IF NOT EXISTS timeline_activity (
    tenant_id TEXT NOT NULL,
    activity_date TEXT NOT NULL,      -- YYYY-MM-DD format
    commit_count INTEGER DEFAULT 0,
    repos_active TEXT,                -- JSON array of repo names
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    activity_level INTEGER DEFAULT 0, -- 0-4 (GitHub-style intensity)
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (tenant_id, activity_date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_timeline_activity_date
ON timeline_activity(activity_date DESC);

-- =============================================================================
-- AI Usage Tracking (for cost monitoring)
-- =============================================================================

CREATE TABLE IF NOT EXISTS timeline_ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    used_at INTEGER NOT NULL,         -- Unix timestamp
    model TEXT NOT NULL,              -- Full model string (e.g., "anthropic/claude-3.5-haiku")
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,          -- Cost in USD
    request_count INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for cost reports by tenant
CREATE INDEX IF NOT EXISTS idx_timeline_ai_usage_tenant_date
ON timeline_ai_usage(tenant_id, used_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

-- Note: This migration creates the schema for the Timeline Curio feature.
--
-- Key design decisions:
-- 1. API keys are stored encrypted (encryption handled at application layer)
-- 2. JSON arrays stored as TEXT (SQLite doesn't have native JSON type)
-- 3. Costs tracked per-day for billing/monitoring
-- 4. Activity table enables efficient heatmap rendering
-- 5. All tables cascade delete when tenant is removed
--
-- Voice presets: professional, quest, casual, poetic, minimal, custom
-- Default model: anthropic/claude-3.5-haiku via OpenRouter
