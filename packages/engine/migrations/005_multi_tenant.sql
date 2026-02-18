-- Migration: Add Multi-Tenant Support to GroveEngine
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/005_multi_tenant.sql --remote
--
-- This migration transforms GroveEngine from a single-site blog into a multi-tenant
-- platform where each tenant gets their own isolated blog on a subdomain.
--
-- Tables created:
--   - tenants: Core tenant/customer information
--   - posts: Blog posts (replaces markdown files)
--   - sessions: Tenant-scoped session management
--   - media: R2 file tracking per tenant
--
-- Tables modified:
--   - pages: Add tenant_id for multi-tenant support
--   - site_settings: Add tenant_id for per-tenant configuration
--
-- Migration Strategy: https://github.com/AutumnsGrove/Lattice/docs/MIGRATION-STRATEGY.md

-- =============================================================================
-- TENANTS TABLE
-- =============================================================================
-- Core table for multi-tenant architecture. Each tenant represents a customer
-- with their own blog on a unique subdomain (e.g., autumn.grove.blog).

CREATE TABLE IF NOT EXISTS tenants (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on creation
  subdomain TEXT UNIQUE NOT NULL,         -- Subdomain for routing (e.g., "autumn", "mom")
  display_name TEXT NOT NULL,             -- Display name for the blog
  email TEXT NOT NULL,                    -- Owner's email for auth and notifications

  -- Subscription & Limits
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'business')),
  storage_used INTEGER DEFAULT 0,         -- Total bytes used in R2
  post_count INTEGER DEFAULT 0,           -- Number of published posts

  -- Business Plan Features
  custom_domain TEXT,                     -- Custom domain (Business plan only)

  -- Customization
  theme TEXT DEFAULT 'default',           -- Theme identifier

  -- Status
  active INTEGER DEFAULT 1,               -- 1 = active, 0 = inactive/suspended

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for subdomain lookups (primary routing mechanism)
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- Index for custom domain lookups (Business plan routing)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- Index for email lookups (auth and admin)
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- =============================================================================
-- POSTS TABLE (NEW)
-- =============================================================================
-- Replaces the file-based approach (UserContent/Posts/*.md) with database storage.
-- Each post belongs to a tenant and is accessed via tenant_id + slug.

CREATE TABLE IF NOT EXISTS posts (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on creation
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table
  slug TEXT NOT NULL,                     -- URL-safe identifier (unique per tenant)

  -- Content
  title TEXT NOT NULL,                    -- Post title
  description TEXT,                       -- Meta description / excerpt
  markdown_content TEXT NOT NULL,         -- Raw markdown source
  html_content TEXT,                      -- Pre-rendered HTML (cached)
  gutter_content TEXT DEFAULT '[]',       -- JSON array of gutter annotations
  tags TEXT DEFAULT '[]',                 -- JSON array of tags

  -- Publishing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image TEXT,                    -- URL to featured image

  -- Metadata
  word_count INTEGER DEFAULT 0,           -- Calculated word count
  reading_time INTEGER DEFAULT 0,         -- Estimated reading time in minutes

  -- Timestamps
  published_at INTEGER,                   -- Unix timestamp when published
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, slug),                -- Slug unique within tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-scoped queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);

-- Index for published posts (public blog listing)
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE status = 'published';

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);

-- Composite index for tenant + status queries
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status ON posts(tenant_id, status, published_at DESC);

-- Index for slug lookups within tenant
CREATE INDEX IF NOT EXISTS idx_posts_tenant_slug ON posts(tenant_id, slug);

-- =============================================================================
-- PAGES TABLE MODIFICATION
-- =============================================================================
-- Add tenant_id to existing pages table for multi-tenant support.
-- Pages are static content like "About", "Contact", "Home".
--
-- NOTE: This migration assumes the pages table already exists from 004_pages_table.sql
-- For new deployments, you may need to modify 004_pages_table.sql instead.

-- Drop existing pages table and recreate with tenant support
DROP TABLE IF EXISTS pages;

CREATE TABLE IF NOT EXISTS pages (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID (new - was slug before)
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table
  slug TEXT NOT NULL,                     -- URL identifier (e.g., "about", "contact")

  -- Content
  title TEXT NOT NULL,                    -- Page title
  description TEXT,                       -- Meta description
  type TEXT NOT NULL DEFAULT 'page',      -- Page type for categorization
  markdown_content TEXT NOT NULL,         -- Raw markdown source
  html_content TEXT,                      -- Pre-rendered HTML (cached)
  hero TEXT,                              -- JSON object for hero section
  gutter_content TEXT DEFAULT '[]',       -- JSON array for gutter items
  font TEXT DEFAULT 'default',            -- Font override for this page

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, slug),                -- Slug unique within tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_pages_tenant ON pages(tenant_id);

-- Index for quick lookups by type
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);

-- Index for ordering by update time
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);

-- Composite index for tenant + slug lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_pages_tenant_slug ON pages(tenant_id, slug);

-- =============================================================================
-- SITE SETTINGS TABLE MODIFICATION
-- =============================================================================
-- Add tenant_id to site_settings for per-tenant configuration.
-- Settings like theme, fonts, social links are now scoped to each tenant.

-- Drop existing site_settings table and recreate with tenant support
DROP TABLE IF EXISTS site_settings;

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table
  setting_key TEXT NOT NULL,              -- Setting identifier (e.g., "font_family")
  setting_value TEXT NOT NULL,            -- Setting value (JSON or string)
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(tenant_id, setting_key),         -- One value per key per tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON site_settings(tenant_id);

-- Index for quick lookups by key within tenant
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant_key ON site_settings(tenant_id, setting_key);

-- =============================================================================
-- SESSIONS TABLE (NEW)
-- =============================================================================
-- Tenant-scoped session management. Replaces JWT-only approach with database
-- sessions for better control and multi-tenant isolation.

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                    -- Session token (UUID)
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table
  user_email TEXT NOT NULL,               -- Email of authenticated user
  expires_at INTEGER NOT NULL,            -- Unix timestamp for expiration
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-scoped session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);

-- Index for expiration-based cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Index for user lookup within tenant
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_user ON sessions(tenant_id, user_email);

-- =============================================================================
-- MEDIA TABLE (NEW)
-- =============================================================================
-- Tracks files uploaded to R2 storage per tenant. Provides metadata and
-- enables storage quota tracking, file management, and media library features.

CREATE TABLE IF NOT EXISTS media (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on upload
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants table

  -- File Information
  filename TEXT NOT NULL,                 -- Generated filename (unique)
  original_name TEXT NOT NULL,            -- Original filename from upload
  r2_key TEXT NOT NULL,                   -- Full R2 object key (tenant_id/filename)
  url TEXT NOT NULL,                      -- Public CDN URL

  -- Metadata
  size INTEGER,                           -- File size in bytes
  width INTEGER,                          -- Image width (null for non-images)
  height INTEGER,                         -- Image height (null for non-images)
  mime_type TEXT,                         -- MIME type (e.g., "image/jpeg")

  -- Timestamps
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for tenant-scoped media queries
CREATE INDEX IF NOT EXISTS idx_media_tenant ON media(tenant_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_media_uploaded ON media(uploaded_at DESC);

-- Index for R2 key lookups
CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media(r2_key);

-- Composite index for tenant + upload time queries
CREATE INDEX IF NOT EXISTS idx_media_tenant_uploaded ON media(tenant_id, uploaded_at DESC);

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. EXISTING DATA MIGRATION:
--    - If you have existing pages or site_settings data, export it before
--      running this migration, then re-import with a default tenant_id.
--
-- 2. MAGIC_CODES TABLE:
--    - The magic_codes table from 001_magic_codes.sql is NOT modified.
--    - Magic codes remain global (not tenant-scoped) for auth flexibility.
--
-- 3. TENANT INITIALIZATION:
--    - After running this migration, create your first tenant via the admin API
--      or run a separate seeding script.
--
-- 4. CONTENT MIGRATION:
--    - To migrate from file-based posts (UserContent/Posts/*.md) to the database,
--      use the import script at scripts/import-content.js (to be created).
--
-- 5. STORAGE QUOTAS:
--    - The storage_used field on tenants is updated via triggers or application
--      logic when files are uploaded/deleted. Consider adding triggers in future.
--
-- 6. CASCADING DELETES:
--    - All foreign keys use ON DELETE CASCADE. Deleting a tenant removes all
--      associated posts, pages, settings, sessions, and media records.
--
-- =============================================================================
-- POST-MIGRATION CHECKLIST
-- =============================================================================
--
-- [ ] Verify all tables created successfully
-- [ ] Verify all indexes created successfully
-- [ ] Create first tenant record for testing
-- [ ] Update hooks.server.js to detect subdomain and load tenant
-- [ ] Update all API routes to filter by tenant_id
-- [ ] Update markdown.js to query posts table instead of file system
-- [ ] Test tenant isolation (Tenant A cannot see Tenant B data)
-- [ ] Set up backup strategy for multi-tenant data
--
-- =============================================================================
