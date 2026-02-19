-- Migration: Journey Curio
-- Description: Add tables for Journey Curio (repository evolution tracking and metrics)
-- Date: 2026-01-17

-- =============================================================================
-- DESIGN DECISION: Universal Line Counts
-- =============================================================================
--
-- This schema standardizes on LINE COUNTS as the universal metric for all content.
-- Both code and documentation are measured in lines, NOT words.
--
-- Rationale:
-- 1. Consistency: All metrics use the same unit, making comparisons meaningful
-- 2. Developer familiarity: Lines of code is the natural unit for repository metrics
-- 3. Tooling: Git, cloc, and tokei all report in lines natively
-- 4. AI context: Token estimation is more accurate from line counts than word counts
--
-- Fields affected:
-- - total_lines: Total lines of code across all files
-- - doc_lines: Lines of documentation (README, docs/, comments)
-- - test_lines: Lines in test files
--
-- =============================================================================

-- =============================================================================
-- Journey Curio Configuration (per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    github_repo_url TEXT,                 -- The repository to track (e.g., "owner/repo")
    github_token TEXT,                    -- GitHub PAT for private repos (encrypted at app layer via AES-256-GCM)
    openrouter_key TEXT,                  -- OpenRouter API key (encrypted at app layer via AES-256-GCM)
    openrouter_model TEXT DEFAULT 'deepseek/deepseek-v3.2',
    snapshot_frequency TEXT DEFAULT 'release',  -- release/weekly/monthly/manual
    show_language_chart INTEGER DEFAULT 1,
    show_growth_chart INTEGER DEFAULT 1,
    show_milestones INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'America/New_York',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- Journey Snapshots (code metrics at specific points in time)
-- =============================================================================
--
-- Each snapshot captures the state of a repository at a moment in time.
-- Snapshots are typically taken at releases, but can also be weekly/monthly.
--
-- Metric standardization:
-- - total_lines: Total lines of source code (from cloc/tokei)
-- - doc_lines: Lines in documentation files (not word count!)
-- - test_lines: Lines in test files
-- - language_breakdown: JSON with per-language line counts and percentages
--
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,          -- YYYY-MM-DD format
    label TEXT,                           -- Version tag (e.g., "v1.0.0") or period label ("weekly-2024-01-15")
    git_hash TEXT,                        -- Commit SHA at snapshot time

    -- Code metrics (all in LINES, not words)
    total_lines INTEGER,                  -- Total source code lines
    language_breakdown TEXT,              -- JSON: {"svelte": {"lines": 1234, "pct": 45.2}, "ts": {...}, ...}
    doc_lines INTEGER,                    -- Documentation lines (standardized: NOT words)
    total_files INTEGER,                  -- Total file count
    directories INTEGER,                  -- Directory count

    -- Activity metrics
    total_commits INTEGER,                -- Total commits in repo history
    commits_since_last INTEGER,           -- Commits since previous snapshot

    -- Quality metrics
    test_files INTEGER,                   -- Number of test files
    test_lines INTEGER,                   -- Lines of test code

    -- Size metrics
    estimated_tokens INTEGER,             -- Estimated LLM tokens (for AI context planning)
    bundle_size_kb INTEGER,               -- Production bundle size in KB

    -- Metadata
    ingestion_source TEXT DEFAULT 'manual',  -- firefly/api/manual
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, snapshot_date, label),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_journey_snapshots_tenant_date
ON journey_snapshots(tenant_id, snapshot_date DESC);

-- Index for label lookups (finding specific versions)
CREATE INDEX IF NOT EXISTS idx_journey_snapshots_label
ON journey_snapshots(tenant_id, label);

-- Index for recent snapshots (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_journey_snapshots_created
ON journey_snapshots(tenant_id, created_at DESC);

-- =============================================================================
-- Journey Summaries (AI-generated release narratives)
-- =============================================================================
--
-- Each summary is tied to a specific snapshot and provides a human-readable
-- narrative of what changed, plus structured highlights for UI display.
--
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_summaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,            -- FK to journey_snapshots
    version TEXT,                         -- Version string (e.g., "v1.0.0")
    summary_date TEXT,                    -- YYYY-MM-DD format

    -- AI-generated content
    summary TEXT,                         -- Markdown narrative of changes
    highlights_features TEXT,             -- JSON array: ["Added dark mode", "New export API", ...]
    highlights_fixes TEXT,                -- JSON array: ["Fixed login timeout", ...]

    -- Structured stats (extracted from commits/changelog)
    stats_commits INTEGER,                -- Total commits in this release
    stats_features INTEGER,               -- Count of feature commits
    stats_fixes INTEGER,                  -- Count of bug fix commits
    stats_refactoring INTEGER,            -- Count of refactoring commits
    stats_docs INTEGER,                   -- Count of documentation commits
    stats_tests INTEGER,                  -- Count of test-related commits
    stats_performance INTEGER,            -- Count of performance commits

    -- AI metadata
    ai_model TEXT,                        -- Model used (e.g., "deepseek/deepseek-v3.2")
    ai_cost_usd REAL DEFAULT 0,           -- Generation cost in USD

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (snapshot_id) REFERENCES journey_snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for snapshot lookups
CREATE INDEX IF NOT EXISTS idx_journey_summaries_snapshot
ON journey_summaries(snapshot_id);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_journey_summaries_tenant_date
ON journey_summaries(tenant_id, summary_date DESC);

-- =============================================================================
-- Journey Jobs (Firefly async job tracking)
-- =============================================================================
--
-- Tracks background analysis jobs initiated by Firefly or the API.
-- Jobs can analyze a repo, backfill historical snapshots, or generate summaries.
--
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    job_type TEXT,                        -- analyze/backfill/summarize/etc
    status TEXT DEFAULT 'pending',        -- pending/running/completed/failed
    progress INTEGER DEFAULT 0,           -- 0-100 percentage
    result_snapshot_id TEXT,              -- FK to journey_snapshots (if job creates one)
    error_message TEXT,                   -- Error details if status = 'failed'
    started_at INTEGER,                   -- Unix timestamp when job started
    completed_at INTEGER,                 -- Unix timestamp when job finished
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for job status queries (finding pending/running jobs)
CREATE INDEX IF NOT EXISTS idx_journey_jobs_status
ON journey_jobs(tenant_id, status);

-- Index for recent jobs (admin/monitoring)
CREATE INDEX IF NOT EXISTS idx_journey_jobs_created
ON journey_jobs(tenant_id, created_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================
--
-- Note: This migration creates the schema for the Journey Curio feature.
--
-- Key design decisions:
--
-- 1. LINE-BASED METRICS: All content measurements use line counts, not words.
--    This applies to total_lines, doc_lines, and test_lines. Word counts are
--    avoided because:
--    - Lines are the standard unit in software development tooling
--    - Git, cloc, tokei, and most analysis tools report lines natively
--    - Token estimation (for AI context) correlates better with lines
--    - Consistent units make growth charts and comparisons meaningful
--
-- 2. SECURITY: API keys (github_token, openrouter_key) are encrypted at rest.
--    Encryption uses AES-256-GCM via TOKEN_ENCRYPTION_KEY environment variable.
--    See docs/security/token-encryption.md for key setup and rotation.
--
-- 3. JSON stored as TEXT (SQLite doesn't have native JSON type)
--    - language_breakdown: {"lang": {"lines": N, "pct": N.N}, ...}
--    - highlights_features: ["feature1", "feature2", ...]
--    - highlights_fixes: ["fix1", "fix2", ...]
--
-- 4. Snapshot uniqueness: UNIQUE(tenant_id, snapshot_date, label) allows
--    multiple snapshots per day (e.g., multiple releases), differentiated by label
--
-- 5. Job tracking enables async Firefly analysis with progress reporting
--
-- 6. All tables cascade delete when tenant is removed
--
-- Snapshot frequencies: release, weekly, monthly, manual
-- Ingestion sources: firefly (automated), api (webhook), manual (UI)
-- Default model: deepseek/deepseek-v3.2 via OpenRouter
--
