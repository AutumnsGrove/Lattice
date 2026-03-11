-- ============================================================================
-- CHIRP: 1:1 DIRECT MESSAGING
-- ============================================================================
-- Implements peer-to-peer direct messaging between Grove tenants.
--
-- Three tables:
--   chat_conversations  — canonical conversation record, keyed by sorted
--                         participant pair to enforce uniqueness
--   chat_messages       — individual messages within a conversation
--   chat_read_cursors   — per-participant read position for unread counts
--
-- Participant ordering: participant_a = min(id1, id2), participant_b = max().
-- This deterministic ordering means a pair always maps to exactly one row,
-- and both participants can find the conversation with a single indexed lookup.
--
-- Content types: 'text' (default) and 'image'. Image messages store
-- dimensions and alt text in the metadata JSON column.
--
-- Retraction: messages are soft-deleted via retracted_at. Content is cleared
-- at the application layer before persisting; the row is preserved to maintain
-- conversation threading integrity.
--
-- @see docs/specs/chirp-spec.md
-- ============================================================================

-- Conversations: one row per unique participant pair
CREATE TABLE IF NOT EXISTS chat_conversations (
    id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    participant_a        TEXT NOT NULL,  -- min(tenantId1, tenantId2)
    participant_b        TEXT NOT NULL,  -- max(tenantId1, tenantId2)
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
    last_message_preview TEXT,
    last_message_at      TEXT,
    UNIQUE(participant_a, participant_b)
);

-- Inbox queries: find all conversations for a participant, newest first
CREATE INDEX IF NOT EXISTS idx_chat_conv_a ON chat_conversations (participant_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conv_b ON chat_conversations (participant_b, updated_at DESC);

-- Messages: append-only log within a conversation
CREATE TABLE IF NOT EXISTS chat_messages (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id),
    sender_id       TEXT NOT NULL,
    content         TEXT NOT NULL,
    content_type    TEXT NOT NULL DEFAULT 'text' CHECK(content_type IN ('text', 'image')),
    metadata        TEXT,           -- JSON: ChatImageMetadata for content_type='image'
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    retracted_at    TEXT            -- soft-delete; content cleared at app layer
);

-- Chronological message fetch within a conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages (conversation_id, created_at DESC);

-- Read cursors: per-participant tracking for unread counts
CREATE TABLE IF NOT EXISTS chat_read_cursors (
    conversation_id      TEXT NOT NULL REFERENCES chat_conversations(id),
    tenant_id            TEXT NOT NULL,
    last_read_message_id TEXT,
    last_read_at         TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, tenant_id)
);
