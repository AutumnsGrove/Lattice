-- Migration: Create tenants table for multi-tenant subdomain routing
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/009_create_tenants_only.sql --remote
--
-- This migration creates ONLY the tenants table for subdomain routing.
-- It does NOT modify existing tables (sessions, users, etc.) which are used
-- by other Grove apps (domains, landing).
--
-- The tenants table enables:
--   - Subdomain-based routing (autumn.grove.place -> tenant lookup)
--   - Tenant metadata (display name, theme, plan)
--   - Active/inactive status for soft-deletion

-- =============================================================================
-- TENANTS TABLE
-- =============================================================================
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

-- Index for subdomain lookups (primary routing mechanism) - only active tenants
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;

-- Index for custom domain lookups (Business plan routing)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- Index for email lookups (auth and admin)
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- =============================================================================
-- TENANT-SCOPED CONTENT TABLES
-- =============================================================================
-- These tables store content that belongs to specific tenants.
-- Each has a tenant_id foreign key for isolation.

-- Posts table for blog content
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  markdown_content TEXT NOT NULL,
  html_content TEXT,
  gutter_content TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status ON posts(tenant_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_slug ON posts(tenant_id, slug);

-- Pages table for static content (about, contact, etc.)
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'page',
  markdown_content TEXT NOT NULL,
  html_content TEXT,
  hero TEXT,
  gutter_content TEXT DEFAULT '[]',
  font TEXT DEFAULT 'default',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pages_tenant ON pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pages_tenant_slug ON pages(tenant_id, slug);

-- Media table for R2 file tracking
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_tenant ON media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media(r2_key);

-- Tenant-specific site settings
CREATE TABLE IF NOT EXISTS tenant_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, setting_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
