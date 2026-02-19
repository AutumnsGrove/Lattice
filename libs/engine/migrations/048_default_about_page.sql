-- Migration: Backfill default about pages and fix home page titles
--
-- Problem: New tenants were provisioned with only a home page (no about page),
-- and the home page title was set to the tenant's display name instead of "Home".
-- The nav bar hardcodes Home/Garden/About links, so clicking "About" 404'd.
--
-- This migration:
-- 1. Fixes home page titles that used the tenant display name
-- 2. Inserts a default about page for any tenant that doesn't have one

-- =============================================================================
-- 1. Fix home page titles
-- =============================================================================
UPDATE pages
SET title = 'Home',
    description = 'Your home page',
    updated_at = unixepoch()
WHERE type = 'home' AND slug = 'home'
  AND title != 'Home';

-- =============================================================================
-- 2. Insert default about pages for tenants that don't have one
-- =============================================================================
INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, gutter_content, font, show_in_nav, nav_order, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
  t.id as tenant_id,
  'about' as slug,
  'About' as title,
  'A little about this site' as description,
  'about' as type,
  '# About' || char(10) || char(10) || 'Welcome! This page is waiting for your story.' || char(10) || char(10) || '*Edit this page from your [admin panel](/arbor/pages/edit/about).*' as markdown_content,
  '<h1>About</h1><p>Welcome! This page is waiting for your story.</p><p><em>Edit this page from your <a href="/arbor/pages/edit/about">admin panel</a>.</em></p>' as html_content,
  '[]' as gutter_content,
  'default' as font,
  0 as show_in_nav,
  0 as nav_order,
  unixepoch() as created_at,
  unixepoch() as updated_at
FROM tenants t
WHERE t.id != 'example-tenant-001'
  AND NOT EXISTS (
    SELECT 1 FROM pages p WHERE p.tenant_id = t.id AND p.slug = 'about'
  );
