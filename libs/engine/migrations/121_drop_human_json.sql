-- 121_drop_human_json.sql
-- Remove the human.json protocol implementation (#1616).
--
-- The protocol never went past its first version and is being replaced by
-- cryptographic content signing (#1225) when that lands. Nothing fills the gap
-- today, so this is a plain cleanup: drop the vouch table, drop its index, and
-- delete the per-tenant enable flag.
--
-- 097_human_json.sql is already applied — do not edit it. This migration is the
-- removal, and it is safe to run on a database that never had the flag set.

DROP INDEX IF EXISTS idx_human_json_vouches_tenant;
DROP TABLE IF EXISTS human_json_vouches;

DELETE FROM site_settings WHERE setting_key = 'human_json_enabled';
