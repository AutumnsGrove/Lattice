-- ============================================================================
-- FIX TENANT RULE JSON FORMAT
-- ============================================================================
-- Corrects malformed rule_value JSON in flag_rules rows created by
-- migrations 040 and 049. The evaluateTenantRule() function expects
-- {"tenantIds": ["..."]} but the original migrations inserted
-- {"tenant_id": "..."}, causing a TypeError crash on .includes().
--
-- This fixes greenhouse features (fireside, scribe, photo_gallery) for all
-- tenants that were enrolled via the original migrations.
-- ============================================================================

UPDATE flag_rules
SET rule_value = '{"tenantIds": ["autumn-primary"]}'
WHERE rule_type = 'tenant'
  AND rule_value = '{"tenant_id": "autumn-primary"}';
