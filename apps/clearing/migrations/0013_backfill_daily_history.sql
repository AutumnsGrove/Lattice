-- Grove Clearing: Rebuild the daily history honestly
-- Migration: 0013_backfill_daily_history.sql
--
-- Two historical lies need unwinding.
--
-- 1. status_daily_history.status was written as the WORST status seen that day
--    until c61619d4b (2026-09-06) switched to a per-check average. Rows written
--    before that were never recomputed, so a single flaky check in August still
--    paints a whole day red and still drags the 90-day uptime percentage down.
--    From migration 0011 onward every check outcome is counted, so the average
--    can be rebuilt exactly. Days with no counts at all (everything before 0011)
--    become 'unknown': grey, and excluded from uptime rather than guessed at.
--
-- 2. incident_count counted every incident still open at midnight, so one slow
--    afternoon stacked up and a component could show a dozen "incidents" on days
--    that were 100% operational. Counting incidents by the day they STARTED makes
--    the number final and meaningful.
--
-- The bucket arithmetic must match averageStatusFromCounts() in
-- src/lib/server/monitor/daily-history.ts:
--   rated checks = operational + degraded + partial_outage + major_outage
--   weighted     = degraded * 1 + partial_outage * 2 + major_outage * 3
--   bucket       = round(weighted / rated)  →  0 operational, 1 degraded,
--                                                2 partial_outage, 3 major_outage
--   maintenance checks are excluded from the average (planned, not a fault) and
--   only describe a day that was entirely maintenance.

-- ── 1. Rebuild each day's status from its check counts ──────────────────────

-- Days with no rated checks: maintenance if that is all we saw, else unknown.
UPDATE status_daily_history
SET status = CASE
      WHEN COALESCE(maintenance_checks, 0) > 0 THEN 'maintenance'
      ELSE 'unknown'
    END
WHERE COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
      + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0) = 0;

UPDATE status_daily_history
SET status = 'operational'
WHERE COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
      + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0) > 0
  AND CAST(ROUND(
        (COALESCE(degraded_checks, 0) * 1
         + COALESCE(partial_outage_checks, 0) * 2
         + COALESCE(major_outage_checks, 0) * 3) * 1.0
        / (COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
           + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0))
      ) AS INTEGER) = 0;

UPDATE status_daily_history
SET status = 'degraded'
WHERE COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
      + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0) > 0
  AND CAST(ROUND(
        (COALESCE(degraded_checks, 0) * 1
         + COALESCE(partial_outage_checks, 0) * 2
         + COALESCE(major_outage_checks, 0) * 3) * 1.0
        / (COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
           + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0))
      ) AS INTEGER) = 1;

UPDATE status_daily_history
SET status = 'partial_outage'
WHERE COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
      + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0) > 0
  AND CAST(ROUND(
        (COALESCE(degraded_checks, 0) * 1
         + COALESCE(partial_outage_checks, 0) * 2
         + COALESCE(major_outage_checks, 0) * 3) * 1.0
        / (COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
           + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0))
      ) AS INTEGER) = 2;

UPDATE status_daily_history
SET status = 'major_outage'
WHERE COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
      + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0) > 0
  AND CAST(ROUND(
        (COALESCE(degraded_checks, 0) * 1
         + COALESCE(partial_outage_checks, 0) * 2
         + COALESCE(major_outage_checks, 0) * 3) * 1.0
        / (COALESCE(operational_checks, 0) + COALESCE(degraded_checks, 0)
           + COALESCE(partial_outage_checks, 0) + COALESCE(major_outage_checks, 0))
      ) AS INTEGER) >= 3;

-- ── 2. Recount incidents by the day they started ────────────────────────────

UPDATE status_daily_history
SET incident_count = (
  SELECT COUNT(*)
  FROM status_incidents i
  INNER JOIN status_incident_components ic ON ic.incident_id = i.id
  WHERE ic.component_id = status_daily_history.component_id
    AND substr(i.started_at, 1, 10) = status_daily_history.date
);
