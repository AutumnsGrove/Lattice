-- Seed script for empty grove tenant (testing empty states)
-- Creates a tenant with default site settings but NO posts, NO custom pages.
-- This lets you test what pages look like when a Wanderer has just set up
-- their grove but hasn't written anything yet.
--
-- Tenant: empty-grove / "Empty Grove"
-- Access locally: http://localhost:5173/?subdomain=empty-grove

-- ============================================
-- CLEAN SLATE (if re-running)
-- ============================================
DELETE FROM posts WHERE tenant_id = 'empty-grove-001';
DELETE FROM pages WHERE tenant_id = 'empty-grove-001';
DELETE FROM tenants WHERE id = 'empty-grove-001';

-- ============================================
-- CREATE TENANT
-- ============================================
INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, active, created_at, updated_at)
VALUES (
  'empty-grove-001',
  'empty-grove',
  'Empty Grove',
  'empty@grove.place',
  'seedling',
  'default',
  1,
  unixepoch(),
  unixepoch()
);

-- ============================================
-- MINIMAL HOME PAGE (required for site to load)
-- ============================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, created_at, updated_at)
VALUES (
  'empty-page-home',
  'empty-grove-001',
  'home',
  'Empty Grove',
  'home',
  '',
  unixepoch(),
  unixepoch()
);
