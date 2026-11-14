-- Migration 008: Drop the tenant-facing Journey curio tables
--
-- Journey was never a tenant offering — it tracked the Grove repo's own
-- evolution, and no other tenant benefits from repository-evolution tracking.
-- The Timeline curio is the real GitHub-activity surface, and the repo's own
-- landing /journey page is CSV-driven and unaffected by this migration.
--
-- We drop rather than leave inert: the tables only ever held repo history for
-- a feature no tenant could enable, and DROP TABLE removes their indexes too.
-- Historical record stays in 025_journey_curio.sql and
-- docs/plans/features/completed/journey-curio-implementation.md.
--
-- Drop order: children before parents (journey_summaries FK -> journey_snapshots).

DROP TABLE IF EXISTS journey_jobs;
DROP TABLE IF EXISTS journey_summaries;
DROP TABLE IF EXISTS journey_snapshots;
DROP TABLE IF EXISTS journey_curio_config;
