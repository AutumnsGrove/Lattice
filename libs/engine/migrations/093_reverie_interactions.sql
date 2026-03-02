-- Reverie interaction history
-- Tracks every AI-powered configuration request through the Reverie pipeline.

CREATE TABLE IF NOT EXISTS reverie_interactions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id       TEXT NOT NULL,
    input_text      TEXT NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('configure', 'atmosphere', 'query', 'ambiguous', 'no-match')),
    domains_matched TEXT NOT NULL DEFAULT '[]',    -- JSON array of domain IDs
    atmosphere_used TEXT,                           -- atmosphere ID if applicable
    tool_calls_generated TEXT NOT NULL DEFAULT '[]', -- JSON array of tool calls from Lumen
    changes_applied TEXT NOT NULL DEFAULT '[]',      -- JSON array of applied changes
    lumen_task      TEXT,                            -- reverie | reverie-compose
    lumen_model     TEXT,                            -- model used for inference
    lumen_latency_ms INTEGER,                        -- inference latency in ms
    success         INTEGER NOT NULL DEFAULT 0,      -- 0 = false, 1 = true
    error_message   TEXT,                            -- error details if failed
    session_id      TEXT,                            -- optional session grouping
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reverie_interactions_tenant_created
    ON reverie_interactions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reverie_interactions_atmosphere
    ON reverie_interactions (atmosphere_used)
    WHERE atmosphere_used IS NOT NULL;
