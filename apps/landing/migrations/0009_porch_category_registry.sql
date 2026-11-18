-- Migration: retire the Porch category CHECK, in favour of one shared registry
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=apps/landing/migrations/0009_porch_category_registry.sql --local
-- Run on production: wrangler d1 execute grove-engine-db --file=apps/landing/migrations/0009_porch_category_registry.sql --remote
--
-- WHY THIS EXISTS
--
-- `0005_porch.sql` constrained the category to a five-value list:
--   CHECK(category IN ('billing', 'technical', 'account', 'hello', 'other'))
-- SQLite cannot alter a CHECK, so adding one category meant rebuilding this
-- table — and the list was also duplicated in VALID_CATEGORIES, the picker's
-- array, and five separate category-label maps. Adding `appeal` (#1721) would
-- have been the second time, and the developer guide had a "write a migration
-- because 0005 uses a CHECK" step in it.
--
-- So the CHECK is retired rather than extended. The visible category list now
-- lives in exactly one place — `PORCH_CATEGORIES` in
-- `libs/engine/src/lib/platform/config/porch.ts` — which the form action
-- validates against (`isPorchCategory`) before insert. The database still
-- refuses a NULL or blank (NOT NULL + DEFAULT 'other'), which is the part a
-- constraint is actually good at; the part it was bad at was making a product
-- list into a schema migration.
--
-- Trade-off, stated plainly: a writer that bypasses the app could store a
-- category the picker does not show. Nothing else writes to this table, and
-- `porchCategoryLabel()` renders an unknown value as itself rather than
-- hiding it, so that failure is loud in Arbor instead of silent.
--
-- REBUILD NOTES
--
-- `porch_messages.visit_id` references `porch_visits(id)`, so the child table
-- is dropped before its parent and restored from an unconstrained copy. Order
-- matters: dropping the parent while a populated child referenced it would
-- cascade. Column order in the two CREATEs below matches 0005 exactly, because
-- both rebuilds use `INSERT INTO … SELECT *`.

-- ---------------------------------------------------------------------------
-- STEP 1: preserve messages (no constraints, so it survives the parent drop)
-- ---------------------------------------------------------------------------
CREATE TABLE porch_messages_backup AS SELECT * FROM porch_messages;

-- ---------------------------------------------------------------------------
-- STEP 2: rebuild porch_visits without the category CHECK
-- ---------------------------------------------------------------------------
CREATE TABLE porch_visits_new (
    id TEXT PRIMARY KEY,
    visit_number TEXT UNIQUE NOT NULL,

    -- Visitor info
    user_id TEXT,                          -- Heartwood user ID (if authenticated)
    guest_email TEXT,                      -- Email for guests
    guest_name TEXT,                       -- Optional name

    -- Visit details
    -- No CHECK on purpose — see the header. Validated in code against the
    -- shared registry before insert.
    category TEXT NOT NULL DEFAULT 'other',
    subject TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'pending', 'resolved')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'urgent')),

    -- Admin notes (internal, not shown to user)
    admin_notes TEXT,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    resolved_at INTEGER,
    resolved_by TEXT
);

INSERT INTO porch_visits_new SELECT * FROM porch_visits;

-- ---------------------------------------------------------------------------
-- STEP 3: swap. Child first, then parent, then restore the child.
-- ---------------------------------------------------------------------------
DROP TABLE porch_messages;
DROP TABLE porch_visits;
ALTER TABLE porch_visits_new RENAME TO porch_visits;

CREATE TABLE porch_messages (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES porch_visits(id) ON DELETE CASCADE,

    -- Sender info
    sender_type TEXT NOT NULL CHECK(sender_type IN ('visitor', 'autumn')),
    sender_name TEXT,                      -- Display name for the message

    -- Content
    content TEXT NOT NULL,

    -- Timestamps
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO porch_messages SELECT * FROM porch_messages_backup;
DROP TABLE porch_messages_backup;

-- ---------------------------------------------------------------------------
-- STEP 4: recreate indexes (dropped with their tables)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_porch_visits_user ON porch_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_porch_visits_email ON porch_visits(guest_email);
CREATE INDEX IF NOT EXISTS idx_porch_visits_status ON porch_visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_porch_visits_created ON porch_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_porch_visits_number ON porch_visits(visit_number);

CREATE INDEX IF NOT EXISTS idx_porch_messages_visit ON porch_messages(visit_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- VERIFY (run these by hand after applying; a migration that cannot be checked
-- is a migration you are trusting)
--
--   SELECT COUNT(*) FROM porch_visits;            -- matches the count before
--   SELECT COUNT(*) FROM porch_messages;          -- matches the count before
--   SELECT category, COUNT(*) FROM porch_visits GROUP BY category;
--   PRAGMA foreign_key_check;                     -- must return no rows
--   PRAGMA index_list('porch_visits');            -- five indexes
--
-- Rollback is a restore, not a statement: the CHECK cannot be re-added without
-- rebuilding again, and there is nothing to un-do if this ran cleanly.
-- ---------------------------------------------------------------------------
