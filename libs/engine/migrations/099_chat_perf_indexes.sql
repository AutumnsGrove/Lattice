-- ============================================================================
-- CHAT PERFORMANCE: Composite indexes for unread count queries
-- ============================================================================
-- The listConversations unread subquery filters chat_messages on
-- (conversation_id, sender_id, retracted_at, created_at). Adding a composite
-- index that covers all four lets SQLite resolve the subquery with an index
-- SEARCH rather than a full conversation scan.
--
-- The chat_read_cursors table is looked up by (conversation_id, tenant_id)
-- which is already the PK. The last_read_message_id lookup resolves via the
-- primary key on chat_messages, so no extra index is needed there.
-- ============================================================================

-- Composite index for unread count subquery:
-- Covers: WHERE conversation_id = ? AND sender_id != ? AND retracted_at IS NULL AND created_at > ?
-- The leading (conversation_id, retracted_at) columns allow SQLite to narrow
-- to non-retracted messages in a conversation before filtering sender/time.
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
ON chat_messages (conversation_id, retracted_at, sender_id, created_at);

-- Also cover the conversation list ORDER BY so the optimizer can use the index
-- for the COALESCE(last_message_at, created_at) sort without a filesort.
-- The existing idx_chat_conv_a and idx_chat_conv_b cover (participant, updated_at),
-- but listConversations sorts on COALESCE(last_message_at, created_at) which
-- those indexes don't cover. Add an index that does.
CREATE INDEX IF NOT EXISTS idx_chat_conv_last_activity
ON chat_conversations (last_message_at DESC, created_at DESC);
