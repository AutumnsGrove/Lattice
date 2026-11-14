-- 122_drop_jxl.sql
-- Remove JPEG XL support (#1603). AVIF is the next-gen format instead.
--
-- JXL never reached production. Checked against the live database on
-- 2026-11-14: `jxl_encoding_metrics` held 0 rows and none of the 66
-- `image_hashes` rows were JXL, so the encoder never produced anything. The
-- table goes with the encoder, the flags, and the UI. WebP remains the default
-- output format.
--
-- Note: four `.jxl` files from 2026-01-21 once sat in `cdn_files`; they were
-- orphaned (nothing referenced them) and have been deleted from R2 and from
-- `cdn_files`, so nothing served by the CDN is left in the format.
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
