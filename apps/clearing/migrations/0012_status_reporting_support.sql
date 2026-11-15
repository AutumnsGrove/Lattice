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
