-- Seed: unsuspend image uploads for the local seeded tenants
--
-- !! LOCAL ONLY. Never run this against a remote database. !!
-- Every tenant starts with uploads suspended (the `uploads_suspended` flag
-- defaults to true) as a safety gate, and unsuspending one in production is a
-- deliberate decision made per tenant in landing's Arbor. dev-stack.sh applies
-- this file with --local only.
--
-- Without it, a fresh local stack answers every upload with GROVE-API-047
-- ("This feature isn't enabled for your site yet"), because canUploadImages()
-- is `image_uploads && !uploads_suspended`.
--
-- The rows are exactly what the real admin action (setUploadSuspension in
-- libs/engine/src/lib/platform/feature-flags/upload-admin.ts) writes: a tenant
-- rule on `uploads_suspended` with result_value 'false'. Its priority is derived
-- from the tenant id (flag_rules is UNIQUE(flag_id, priority)):
--
--   priority = 1000 + abs(hash) % 64536, hash = hash * 31 + charCode, as an int32
--
-- INSERT OR IGNORE keeps this safe to run twice.
--
-- Note: upload also runs the Petal image-safety scan, which calls Workers AI and
-- needs it to run remotely. See "What's Not Local" in docs/LOCAL_DEV.md.

INSERT OR IGNORE INTO flag_rules (flag_id, rule_type, rule_value, result_value, priority, enabled, created_at)
VALUES
  ('uploads_suspended', 'tenant', '{"tenantIds":["example-tenant-001"]}', 'false', 29161, 1, datetime('now')),
  ('uploads_suspended', 'tenant', '{"tenantIds":["example-tenant-002"]}', 'false', 29162, 1, datetime('now')),
  ('uploads_suspended', 'tenant', '{"tenantIds":["example-tenant-003"]}', 'false', 29163, 1, datetime('now'));
