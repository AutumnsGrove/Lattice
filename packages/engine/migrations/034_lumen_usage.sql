-- Lumen AI Gateway Usage Tracking
-- Stores metadata ONLY - never stores content!
--
-- This table tracks AI usage per tenant for:
-- - Quota enforcement (daily limits per task)
-- - Cost tracking
-- - Analytics and insights
--
-- Schema designed for efficient daily quota checks with composite index.

CREATE TABLE IF NOT EXISTS lumen_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Tenant and task identification
    tenant_id TEXT NOT NULL,
    task TEXT NOT NULL,          -- moderation, generation, summary, embedding, chat, image, code

    -- Provider and model used
    model TEXT NOT NULL,
    provider TEXT NOT NULL,      -- openrouter, cloudflare-ai

    -- Usage metrics (no content!)
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,         -- Cost in USD
    latency_ms INTEGER DEFAULT 0,
    cached INTEGER DEFAULT 0,    -- Boolean: was response cached?

    -- Timestamp
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Primary index for quota checking: "how many task X requests today?"
-- This is the most frequent query pattern
CREATE INDEX IF NOT EXISTS idx_lumen_tenant_task_time
    ON lumen_usage(tenant_id, task, created_at DESC);

-- Index for tenant-wide analytics
CREATE INDEX IF NOT EXISTS idx_lumen_tenant_time
    ON lumen_usage(tenant_id, created_at DESC);

-- Index for system-wide analytics (admin dashboards)
CREATE INDEX IF NOT EXISTS idx_lumen_time
    ON lumen_usage(created_at DESC);

-- Index for cost reporting by provider
CREATE INDEX IF NOT EXISTS idx_lumen_provider_time
    ON lumen_usage(provider, created_at DESC);
