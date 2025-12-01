-- GroveEngine Multi-Tenant Database Schema
-- Target: Cloudflare D1
-- Version: 1.0.0
-- Created: December 1, 2025

-- ============================================
-- CORE TABLES
-- ============================================

-- Tenants: Each subdomain is a tenant
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,                    -- UUID
  subdomain TEXT UNIQUE NOT NULL,         -- e.g., "autumn", "mom-publishing"
  display_name TEXT NOT NULL,             -- Human-readable name
  email TEXT NOT NULL,                    -- Owner email
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'business')),
  storage_used INTEGER DEFAULT 0,         -- Bytes used
  storage_limit INTEGER DEFAULT 5368709120, -- 5GB default (starter)
  post_count INTEGER DEFAULT 0,
  post_limit INTEGER DEFAULT 250,         -- Starter plan limit
  custom_domain TEXT,                     -- Business plan only
  theme TEXT DEFAULT 'default',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Posts: Blog posts with multi-tenant support
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  markdown_content TEXT NOT NULL,
  html_content TEXT,                      -- Pre-rendered HTML
  gutter_content TEXT DEFAULT '[]',       -- JSON array of gutter items
  tags TEXT DEFAULT '[]',                 -- JSON array of tags
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image TEXT,                    -- URL to featured image
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,         -- Estimated minutes
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Pages: Static pages (Home, About, Contact, etc.)
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,                     -- 'home', 'about', 'contact', etc.
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'page' CHECK (type IN ('page', 'home', 'about', 'contact')),
  markdown_content TEXT NOT NULL,
  html_content TEXT,                      -- Pre-rendered HTML
  hero TEXT,                              -- JSON object for hero section
  gutter_content TEXT DEFAULT '[]',       -- JSON array of gutter items
  font TEXT DEFAULT 'default',
  display_order INTEGER DEFAULT 0,        -- For navigation ordering
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Media: Images and files stored in R2
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,                 -- Generated filename (UUID-based)
  original_name TEXT NOT NULL,            -- Original upload name
  r2_key TEXT NOT NULL,                   -- R2 object key
  url TEXT NOT NULL,                      -- CDN URL
  size INTEGER NOT NULL,                  -- Bytes
  width INTEGER,                          -- Image width (if applicable)
  height INTEGER,                         -- Image height (if applicable)
  mime_type TEXT NOT NULL,
  alt_text TEXT,                          -- Accessibility
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================
-- CONFIGURATION TABLES
-- ============================================

-- Site Settings: Per-tenant configuration
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,            -- JSON-encoded value
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, setting_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Themes: Available themes (could be global or per-tenant)
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  preview_image TEXT,
  config TEXT NOT NULL,                   -- JSON theme configuration
  plan_required TEXT DEFAULT 'starter' CHECK (plan_required IN ('starter', 'professional', 'business')),
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ============================================
-- AUTHENTICATION TABLES
-- ============================================

-- Magic Codes: Email verification codes
CREATE TABLE IF NOT EXISTS magic_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,                -- SHA-256 hash of code
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0              -- Rate limiting
);

-- Sessions: User sessions with tenant context
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                    -- Session token
  tenant_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT DEFAULT 'admin' CHECK (user_role IN ('admin', 'editor', 'viewer')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_active_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Users: Tenant users (admins, editors)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================
-- ANALYTICS TABLES (Optional - Phase 2)
-- ============================================

-- Page Views: Basic analytics
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  path TEXT NOT NULL,
  post_id TEXT,                           -- If viewing a post
  referrer TEXT,
  user_agent TEXT,
  country TEXT,                           -- From CF headers
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- Post queries
CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_status ON posts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_published ON posts(tenant_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(tenant_id, slug);

-- Page queries
CREATE INDEX IF NOT EXISTS idx_pages_tenant ON pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(tenant_id, slug);

-- Media queries
CREATE INDEX IF NOT EXISTS idx_media_tenant ON media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded ON media(tenant_id, uploaded_at DESC);

-- Settings queries
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON site_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON site_settings(tenant_id, setting_key);

-- Auth queries
CREATE INDEX IF NOT EXISTS idx_magic_codes_email ON magic_codes(email);
CREATE INDEX IF NOT EXISTS idx_magic_codes_lookup ON magic_codes(email, used, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_tenant ON page_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(tenant_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views(post_id) WHERE post_id IS NOT NULL;

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default theme
INSERT INTO themes (id, name, slug, description, config, is_default)
VALUES (
  'theme_default',
  'Grove Default',
  'default',
  'The default Grove theme with clean typography and warm colors',
  '{"colors":{"primary":"#5cb85f","secondary":"#3d8b40","accent":"#8bc34a","background":"#fafafa","text":"#333"},"fonts":{"heading":"Alagard","body":"system-ui"},"features":{"gutterLinks":true,"tableOfContents":true,"darkMode":false}}',
  1
) ON CONFLICT(slug) DO NOTHING;

-- ============================================
-- PLAN LIMITS REFERENCE
-- ============================================
--
-- Starter ($12/month):
--   - post_limit: 250 (archived, not deleted)
--   - storage_limit: 5GB (5368709120 bytes)
--   - themes: 1 (default only)
--   - custom_domain: No
--
-- Professional ($25/month):
--   - post_limit: NULL (unlimited)
--   - storage_limit: 20GB (21474836480 bytes)
--   - themes: 3
--   - custom_domain: No
--
-- Business ($199 + $49/month):
--   - post_limit: NULL (unlimited)
--   - storage_limit: 100GB (107374182400 bytes)
--   - themes: 10
--   - custom_domain: Yes
--
-- ============================================
