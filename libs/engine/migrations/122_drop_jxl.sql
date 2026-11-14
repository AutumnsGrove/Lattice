-- 122_drop_jxl.sql
-- Remove JPEG XL support (#1603). AVIF is the next-gen format instead.
--
-- JXL never reached production: `jxl_encoding` shipped at 0% rollout and its
-- kill switch was on standby, so `jxl_encoding_metrics` should be empty. The
-- table goes with the encoder, the flags, and the UI. WebP remains the default
-- output format.
--
-- 020_feature_flags.sql and 023_jxl_format_tracking.sql are already applied —
-- do not edit them. This migration is the removal, and it is safe to run on a
-- database that never had the flags, or on one that still does.
--
-- `flag_rules` is deleted explicitly rather than relying on the ON DELETE CASCADE:
-- SQLite only cascades when `PRAGMA foreign_keys` is on, so an explicit delete
-- keeps the cleanup correct either way. `flag_audit_log` is deliberately left
-- alone — it is the record of what was changed, not live configuration, and it
-- has no FK. Cached evaluations (`flag:jxl_*`) expire on their own short TTL.

DROP TABLE IF EXISTS jxl_encoding_metrics;

DELETE FROM flag_rules
WHERE flag_id IN ('jxl_encoding', 'jxl_kill_switch', 'jxl_rollout_percentage');

DELETE FROM feature_flags
WHERE id IN ('jxl_encoding', 'jxl_kill_switch', 'jxl_rollout_percentage');
