-- Migration 128: Fireside's conversation
-- Database: D1 (SQLite) - grove-engine-db
--
-- Fireside is a conversation the writer has *before* the words exist, so for the
-- first time a Grove feature has to keep an AI conversation around: resume means
-- re-opening yesterday's fire, and a public transcript means the writer's own
-- half of that conversation outlives the session.
--
-- ## The two ownership rules
--
-- 1. **The post owns its transcript, not the other way round.** `posts` gets
--    `fireside_session_id`, not `fireside_sessions.post_id`. The post is the
--    durable artefact; the session is the transient one. Delete the post and the
--    conversation behind it goes; let a session expire and the post keeps its
--    attribution (`SET NULL`), losing a link to nothing.
-- 2. **A published transcript is exempt from expiry.** Enforced where expiry is
--    enforced (the sweep), not here — the column is just the record of the choice.
--
-- ## What is deliberately not in this file
--
-- - `posts.fireside_assisted` already exists: 027 added it in 2025, and the
--   Drizzle schema never learned about it. 128 adds the missing half (the link)
--   and leaves the flag alone, so a fresh bootstrap still gets it from 027.
-- - `wisp_requests` is not used. It is marked deprecated, has no live writers,
--   and a table called `wisp_requests` sitting next to a cost-bearing session is
--   exactly the thing someone will helpfully start writing to.
--
-- ## Applying
--
-- The statements are idempotent except the `posts` ALTER, which cannot be:
-- SQLite has no `ADD COLUMN IF NOT EXISTS`, and rebuilding `posts` to add one
-- nullable column is the cascade-prone swap 116 must never run. A database that
-- already has `posts.fireside_session_id` will fail there with `duplicate column
-- name`; only local dev can be in that state, since production has exactly one
-- `grove-engine-db`. Delete the local D1 file (or `./scripts/dev-stack.sh reset`)
-- once and it applies cleanly.

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fireside_sessions (
  id                      TEXT PRIMARY KEY,                 -- server-minted, never client-supplied
  tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                 TEXT NOT NULL,                    -- the writer, for "your open sessions"
  status                  TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','drafted','accepted','abandoned')),
  turns                   INTEGER NOT NULL DEFAULT 0,
  input_tokens            INTEGER NOT NULL DEFAULT 0,
  output_tokens           INTEGER NOT NULL DEFAULT 0,
  cost_usd                REAL NOT NULL DEFAULT 0,          -- the writer's own key: recorded, not capped
  model                   TEXT,                             -- whichever model Lumen chose
  transcript_public       INTEGER NOT NULL DEFAULT 0,
  transcript_published_at INTEGER,
  started_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at              INTEGER                             -- NULL = never (or not yet decided)
);

-- The drawer's "pick it back up" query: this tenant's sessions, newest first.
CREATE INDEX IF NOT EXISTS idx_fireside_sessions_tenant_updated
  ON fireside_sessions(tenant_id, updated_at);

-- At most a handful of open sessions per writer; partial so it stays small.
CREATE INDEX IF NOT EXISTS idx_fireside_sessions_open
  ON fireside_sessions(tenant_id, user_id)
  WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fireside_messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES fireside_sessions(id) ON DELETE CASCADE,
  tenant_id  TEXT NOT NULL,                     -- denormalised: every query filters on it
  role       TEXT NOT NULL CHECK (role IN ('user','wisp')),
  kind       TEXT NOT NULL DEFAULT 'turn' CHECK (kind IN ('turn','draft')),
  content    TEXT NOT NULL CHECK (length(content) <= 8000),
  seq        INTEGER NOT NULL,                  -- ordering, because two turns in one second is normal
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- `seq`, not `created_at`, orders a conversation. The unique constraint is also
-- what makes "append the next message" safe to retry.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fireside_messages_session_seq
  ON fireside_messages(session_id, seq);

-- ---------------------------------------------------------------------------
-- The post's end of the link
-- ---------------------------------------------------------------------------
-- NOT idempotent — see the header. `SET NULL` is what lets a session expire or
-- be deleted without taking the post's attribution with it.

ALTER TABLE posts ADD COLUMN fireside_session_id TEXT
  REFERENCES fireside_sessions(id) ON DELETE SET NULL;
