-- 027_wisp_fireside.sql
-- Fireside mode additions for Wisp
-- Backward compatible: all new columns have defaults

-- =============================================================================
-- WISP_REQUESTS TABLE ADDITION
-- =============================================================================
-- Track Fireside sessions (not individual messages, just the final draft)

ALTER TABLE wisp_requests ADD COLUMN fireside_session_id TEXT;

-- Index for querying requests by session (e.g., cost aggregation)
CREATE INDEX IF NOT EXISTS idx_wisp_fireside_session
    ON wisp_requests(fireside_session_id)
    WHERE fireside_session_id IS NOT NULL;

-- =============================================================================
-- POSTS TABLE ADDITION
-- =============================================================================
-- Track posts created via Fireside for transparency

ALTER TABLE posts ADD COLUMN fireside_assisted INTEGER DEFAULT 0;

-- Index for querying fireside posts (sparse index, only on fireside posts)
CREATE INDEX IF NOT EXISTS idx_posts_fireside
    ON posts(fireside_assisted)
    WHERE fireside_assisted = 1;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- 1. BACKWARD COMPATIBILITY:
--    - All new columns have sensible defaults
--    - Existing posts automatically have fireside_assisted = 0
--    - Existing wisp_requests have fireside_session_id = NULL
--    - No breaking changes to existing queries
--
-- 2. TRANSPARENCY ENFORCEMENT:
--    - fireside_assisted = 1 means the post was drafted via Fireside mode
--    - The transparency marker ("~ written fireside with Wisp ~") is enforced
--      at the application level in the API, not the database
--    - Once set to 1, fireside_assisted cannot be unset (enforced in API)
--
-- 3. PRIVACY:
--    - Conversation content is NEVER stored in the database
--    - Only the final draft generation request is logged to wisp_requests
--    - fireside_session_id is for cost aggregation only, not message recovery
--
