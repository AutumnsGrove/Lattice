-- D1 Schema for Git Stats Historical Data
-- Database: autumnsgrove-git-stats

-- Track repositories being monitored
CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(owner, name)
);

-- Store daily snapshots of repository stats
CREATE TABLE IF NOT EXISTS repo_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    total_commits INTEGER DEFAULT 0,
    total_additions INTEGER DEFAULT 0,
    total_deletions INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    UNIQUE(repo_id, snapshot_date)
);

-- Store individual commits for history tracking
CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    sha TEXT NOT NULL,
    message TEXT,
    author TEXT,
    committed_at TEXT NOT NULL,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    UNIQUE(repo_id, sha)
);

-- Store TODO snapshots for progress tracking
CREATE TABLE IF NOT EXISTS todo_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    total_todos INTEGER DEFAULT 0,
    completed_todos INTEGER DEFAULT 0,
    code_todos INTEGER DEFAULT 0,
    markdown_todos INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    UNIQUE(repo_id, snapshot_date)
);

-- Store AI analysis results
CREATE TABLE IF NOT EXISTS ai_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    analysis_date TEXT NOT NULL,
    health_score INTEGER,
    raw_analysis TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Store commit activity by hour/day for heatmaps
CREATE TABLE IF NOT EXISTS commit_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    activity_date TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK(hour >= 0 AND hour <= 23),
    day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
    commit_count INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    UNIQUE(repo_id, activity_date, hour)
);

-- Store daily development summaries for timeline display
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_date TEXT NOT NULL UNIQUE,       -- YYYY-MM-DD format
    brief_summary TEXT,                       -- 1-2 sentence overview (null for rest days)
    detailed_timeline TEXT,                   -- Full markdown breakdown
    gutter_content TEXT,                      -- JSON array of gutter items for side comments
    commit_count INTEGER DEFAULT 0,
    repos_active TEXT,                        -- JSON array of repo names
    total_additions INTEGER DEFAULT 0,
    total_deletions INTEGER DEFAULT 0,
    ai_model TEXT,                            -- Model used for generation
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track AI usage and costs across providers
CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usage_date TEXT NOT NULL,                 -- YYYY-MM-DD format
    provider TEXT NOT NULL,                   -- 'anthropic', 'cloudflare', 'moonshot'
    model TEXT NOT NULL,                      -- Full model ID
    request_count INTEGER DEFAULT 1,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,        -- Estimated cost in USD
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(usage_date, provider, model)
);

-- Track individual AI requests for detailed cost analysis
CREATE TABLE IF NOT EXISTS ai_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_date TEXT NOT NULL,               -- YYYY-MM-DD format
    request_time TEXT NOT NULL DEFAULT (datetime('now')),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    purpose TEXT,                             -- 'daily_summary', 'analysis', etc.
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    summary_date TEXT,                        -- Link to daily_summaries if applicable
    success INTEGER DEFAULT 1,                -- 1 = success, 0 = failure
    error_message TEXT
);

-- Track background jobs for async processing
CREATE TABLE IF NOT EXISTS background_jobs (
    id TEXT PRIMARY KEY,                       -- UUID for job
    job_type TEXT NOT NULL,                    -- 'backfill', 'single_summary', etc.
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,                -- Percentage complete (0-100)
    total_items INTEGER DEFAULT 0,             -- Total items to process
    completed_items INTEGER DEFAULT 0,         -- Items completed so far
    result TEXT,                               -- JSON result data
    error_message TEXT,                        -- Error if failed
    metadata TEXT,                             -- JSON metadata (dates, model, etc.)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT                          -- When job finished
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_repo_snapshots_date ON repo_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_todo_snapshots_date ON todo_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_commit_activity_date ON commit_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_date ON ai_requests(request_date DESC);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created ON background_jobs(created_at DESC);

-- Gallery System Tables
-- Image metadata with hybrid R2 + D1 approach

-- Gallery image metadata (hybrid R2 + D1 approach)
CREATE TABLE IF NOT EXISTS gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT NOT NULL UNIQUE,              -- R2 object key (filename/path)

    -- Parsed metadata (auto-extracted from filename)
    parsed_date TEXT,                          -- YYYY-MM-DD from filename
    parsed_category TEXT,                      -- e.g., 'minecraft', 'selfies' from path
    parsed_slug TEXT,                          -- e.g., 'forest-walk' from 'forest-walk.jpg'

    -- Custom metadata (manually added via admin)
    custom_title TEXT,                         -- Override parsed slug
    custom_description TEXT,                   -- Rich description
    custom_date TEXT,                          -- Override parsed date

    -- R2 cached data (synced periodically)
    file_size INTEGER,
    uploaded_at TEXT,
    cdn_url TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Gallery tags (user-defined categories)
CREATE TABLE IF NOT EXISTS gallery_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,                 -- e.g., 'minecraft', 'food', 'selfies'
    slug TEXT NOT NULL UNIQUE,                 -- URL-safe version
    color TEXT DEFAULT '#5cb85f',              -- Hex color for badge
    description TEXT,                          -- Optional tag description
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Many-to-many: images to tags
CREATE TABLE IF NOT EXISTS gallery_image_tags (
    image_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES gallery_tags(id) ON DELETE CASCADE
);

-- Gallery collections (curated albums)
CREATE TABLE IF NOT EXISTS gallery_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                        -- e.g., 'Pride 2024', 'Grove Progress'
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image_id INTEGER,                    -- Featured image for collection
    display_order INTEGER DEFAULT 0,           -- Sort order for display
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cover_image_id) REFERENCES gallery_images(id) ON DELETE SET NULL
);

-- Many-to-many: images to collections
CREATE TABLE IF NOT EXISTS gallery_collection_images (
    collection_id INTEGER NOT NULL,
    image_id INTEGER NOT NULL,
    display_order INTEGER DEFAULT 0,          -- Order within collection
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES gallery_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE
);

-- Indexes for gallery performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_parsed_date ON gallery_images(parsed_date DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_images_parsed_category ON gallery_images(parsed_category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_r2_key ON gallery_images(r2_key);
CREATE INDEX IF NOT EXISTS idx_gallery_tags_slug ON gallery_tags(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_collections_slug ON gallery_collections(slug);
