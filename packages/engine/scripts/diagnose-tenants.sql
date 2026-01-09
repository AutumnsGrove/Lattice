-- Tenant Diagnostic Script for GroveEngine
-- Run with: npx wrangler d1 execute grove-engine-db --file=scripts/diagnose-tenants.sql --remote
--
-- This script helps identify:
-- 1. All tenants in the system
-- 2. Post counts per tenant
-- 3. Which subdomain maps to which posts

-- List all tenants
SELECT '=== ALL TENANTS ===' as section;
SELECT
  id,
  subdomain,
  display_name,
  email,
  plan,
  custom_domain,
  active,
  created_at
FROM tenants
ORDER BY created_at DESC;

-- Post counts per tenant
SELECT '=== POSTS PER TENANT ===' as section;
SELECT
  t.subdomain,
  t.display_name,
  COUNT(p.id) as post_count,
  t.id as tenant_id
FROM tenants t
LEFT JOIN posts p ON p.tenant_id = t.id
GROUP BY t.id, t.subdomain, t.display_name
ORDER BY post_count DESC;

-- Recent posts with their tenant info
SELECT '=== RECENT POSTS (last 10) ===' as section;
SELECT
  p.title,
  p.slug,
  t.subdomain as tenant_subdomain,
  p.created_at
FROM posts p
JOIN tenants t ON p.tenant_id = t.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check if 'autumnsgrove' and 'dave2' tenants exist
SELECT '=== SPECIFIC TENANT CHECK ===' as section;
SELECT
  subdomain,
  id,
  email,
  display_name,
  active
FROM tenants
WHERE subdomain IN ('autumnsgrove', 'dave2', 'autumn');
