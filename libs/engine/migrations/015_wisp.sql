-- Wisp - Grove Writing Assistant
-- Track usage for rate limiting and cost management

CREATE TABLE IF NOT EXISTS wisp_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,           -- 'grammar', 'tone', 'readability', 'all'
    mode TEXT NOT NULL,             -- 'quick', 'thorough'
    model TEXT NOT NULL,            -- Model used (e.g., 'deepseek-v3.2', 'local')
    provider TEXT NOT NULL,         -- Inference provider (e.g., 'fireworks', 'local')
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,            -- USD
    post_slug TEXT,                 -- Optional: which post was analyzed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rate limiting and usage queries
CREATE INDEX IF NOT EXISTS idx_wisp_user_time
    ON wisp_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wisp_created
    ON wisp_requests(created_at DESC);
-- Compound index for monthly cost cap query (SELECT SUM(cost) WHERE user_id AND created_at)
CREATE INDEX IF NOT EXISTS idx_wisp_user_cost
    ON wisp_requests(user_id, created_at DESC, cost);
