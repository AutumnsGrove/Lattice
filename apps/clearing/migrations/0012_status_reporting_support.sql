-- Grove Clearing: Last Check Timestamp and incident lookup index
-- Migration: 0012_status_reporting_support.sql
--
-- 1. last_check_at
--
-- current_status.updated_at only moves when a status *changes*, so the page had
-- no way to tell "operational as of two minutes ago" from "last seen operational
-- three days ago". It papered over that by stamping the render time as
-- "Last updated", claiming freshness over day-old data.
--
-- last_check_at is written on every health check, changed or not.
--
-- 2. status_incident_components(component_id)
--
-- Incident resolution and the per-day incident counts now look incidents up by
-- component instead of by a single id remembered in KV, so this join needs an
-- index.

ALTER TABLE status_components ADD COLUMN last_check_at TEXT;

CREATE INDEX IF NOT EXISTS idx_incident_components_component
  ON status_incident_components(component_id);

-- 3. auto_resolve
--
-- Incidents can be created three ways: the monitor, the Arbor admin form, and
-- the Sentinel load test. Only the monitor's own incidents may be closed by
-- automation — an operator's security or maintenance notice on a healthy
-- component must stay open until a human closes it.
--
-- Defaults to 0, so every existing row and every future manual insert is
-- operator-owned. The monitor sets it to 1 on insert; migration 0013 marks the
-- ones it already created, identified by their automated first update.

ALTER TABLE status_incidents ADD COLUMN auto_resolve INTEGER NOT NULL DEFAULT 0;
