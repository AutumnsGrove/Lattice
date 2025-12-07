-- Domain Finder Schema
-- Run this against your D1 database to add the domain search tables
-- These tables extend the existing grove-engine-db schema
--
-- IMPORTANT: This schema requires the following tables from the main platform:
--   - users (id, email, is_admin, created_at, updated_at)
--   - sessions (id, user_id, expires_at, created_at)
--   - magic_codes (id, email, code, expires_at, used_at, created_at)
-- These tables are defined in the main GroveEngine schema.
--
-- NOTE: D1 (SQLite) does not enforce foreign key constraints by default.
-- The REFERENCES clauses are for documentation only. Cascading deletes
-- must be handled in application code if needed.

-- ============================================================================
-- Domain Search Jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS domain_search_jobs (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_email TEXT NOT NULL,
    business_name TEXT NOT NULL,
    domain_idea TEXT,
    tld_preferences TEXT NOT NULL DEFAULT '["com"]', -- JSON array
    vibe TEXT NOT NULL DEFAULT 'professional',
    keywords TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, complete, needs_followup, failed, cancelled
    batch_num INTEGER NOT NULL DEFAULT 0,
    domains_checked INTEGER NOT NULL DEFAULT 0,
    domains_available INTEGER NOT NULL DEFAULT 0, -- Count of available domains found
    good_results INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    started_at TEXT,
    completed_at TEXT,
    duration_seconds INTEGER, -- Total duration in seconds
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing jobs by status and date
CREATE INDEX IF NOT EXISTS idx_domain_jobs_status ON domain_search_jobs(status);
CREATE INDEX IF NOT EXISTS idx_domain_jobs_created ON domain_search_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_jobs_client ON domain_search_jobs(client_email);

-- ============================================================================
-- Domain Results
-- ============================================================================
CREATE TABLE IF NOT EXISTS domain_results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL, -- References domain_search_jobs(id) - FK not enforced by D1
    domain TEXT NOT NULL,
    tld TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown', -- available, registered, unknown
    score REAL NOT NULL DEFAULT 0, -- 0-1 AI evaluation score
    price_cents INTEGER,
    price_category TEXT, -- bundled, recommended, standard, premium
    flags TEXT, -- JSON array of flags
    notes TEXT,
    batch_num INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for getting results by job
CREATE INDEX IF NOT EXISTS idx_domain_results_job ON domain_results(job_id);
CREATE INDEX IF NOT EXISTS idx_domain_results_status ON domain_results(job_id, status);
CREATE INDEX IF NOT EXISTS idx_domain_results_score ON domain_results(job_id, score DESC);

-- ============================================================================
-- Domain Search Configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS domain_search_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'default',
    driver_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    swarm_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    max_batches INTEGER NOT NULL DEFAULT 6,
    candidates_per_batch INTEGER NOT NULL DEFAULT 50,
    target_good_results INTEGER NOT NULL DEFAULT 25,
    creativity REAL NOT NULL DEFAULT 0.8, -- 0-1 scale
    rdap_delay_seconds REAL NOT NULL DEFAULT 10,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for finding active config
CREATE INDEX IF NOT EXISTS idx_domain_config_active ON domain_search_config(is_active, updated_at DESC);

-- ============================================================================
-- Insert default configuration
-- ============================================================================
INSERT OR IGNORE INTO domain_search_config (
    id,
    name,
    driver_model,
    swarm_model,
    max_batches,
    candidates_per_batch,
    target_good_results,
    creativity,
    rdap_delay_seconds,
    is_active
) VALUES (
    'default-config',
    'default',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    6,
    50,
    25,
    0.8,
    10,
    1
);
