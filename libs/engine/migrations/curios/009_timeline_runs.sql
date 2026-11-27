-- Migration 009: the timeline's Lyra run records (#1798, slice 3)
--
-- A day written by the Lyra recipe keeps its whole run beside the day it wrote.
-- The record is the tenant's audit trail and is replayable from (Lyra decision 51),
-- so its entries are kept as the lines Lyra wrote, one row each, in the order they
-- were written. `timeline_run_entries.seq` is the position Lyra's storage slot
-- returns, and `(run_id, seq)` being the primary key is what makes a repeated append
-- a refusal rather than a second line.
--
-- The finished page is also on the run row. It is derived from the record, and
-- storing it is deliberate: the comparison in slice 4 reads both paths' output
-- without replaying a record, and the cutover in slice 5 becomes a pointer change
-- rather than a migration. The record stays the source of truth.
--
-- Nothing reads these tables yet. The existing timeline tables are untouched, and
-- the old prompt path keeps writing them until the cutover.

CREATE TABLE IF NOT EXISTS timeline_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    run_date TEXT NOT NULL,
    recipe TEXT NOT NULL,
    recipe_version INTEGER NOT NULL,
    -- done | parked | failed, as Lyra's run end says it.
    status TEXT NOT NULL,
    model TEXT,
    turns INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    -- The serialized page, in the shape timeline_summaries already holds.
    markdown TEXT,
    gutter_content TEXT,
    continuation_of TEXT,
    error TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_timeline_runs_tenant_date
ON timeline_runs(tenant_id, run_date DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_runs_tenant_status
ON timeline_runs(tenant_id, status, run_date DESC);

CREATE TABLE IF NOT EXISTS timeline_run_entries (
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    line TEXT NOT NULL,
    PRIMARY KEY (run_id, seq)
);
