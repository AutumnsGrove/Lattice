-- Migration: Gallery Curio
-- Description: Add tables for Gallery Curio (R2-backed image gallery with metadata)
-- Date: 2026-01-19

-- =============================================================================
-- Gallery Curio Configuration (per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,

    -- R2 Storage Configuration
    r2_bucket TEXT,                    -- R2 bucket binding name
    cdn_base_url TEXT,                 -- CDN URL prefix (e.g., https://cdn.example.com)

    -- Display Settings
    gallery_title TEXT,                -- Page title (defaults to "Gallery")
    gallery_description TEXT,          -- Subtitle/description
    items_per_page INTEGER DEFAULT 30, -- Images per batch for lazy loading
    sort_order TEXT DEFAULT 'date-desc', -- date-desc, date-asc, title-asc, title-desc

    -- Feature Toggles
    show_descriptions INTEGER DEFAULT 1,
    show_dates INTEGER DEFAULT 1,
    show_tags INTEGER DEFAULT 1,
    enable_lightbox INTEGER DEFAULT 1,
    enable_search INTEGER DEFAULT 1,
    enable_filters INTEGER DEFAULT 1,

    -- Layout Settings
    grid_style TEXT DEFAULT 'masonry', -- masonry, uniform, mood-board
    thumbnail_size TEXT DEFAULT 'medium', -- small, medium, large

    -- Advanced Settings
    settings TEXT DEFAULT '{}',        -- JSON: additional custom settings
    custom_css TEXT,                   -- Custom CSS for gallery styling

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- Gallery Images (multi-tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,              -- R2 object key (path in bucket)

    -- Parsed metadata (auto-extracted from filename)
    parsed_date TEXT,                  -- YYYY-MM-DD from filename (e.g., 2025-01-15_photo.jpg)
    parsed_category TEXT,              -- From path structure (e.g., minecraft/build.png -> minecraft)
    parsed_slug TEXT,                  -- Descriptive part (e.g., forest-walk from forest-walk.jpg)

    -- Custom metadata (manually added via admin)
    custom_title TEXT,                 -- Override display title
    custom_description TEXT,           -- Rich description
    custom_date TEXT,                  -- Override display date
    alt_text TEXT,                     -- Accessibility alt text

    -- R2 cached data (synced periodically)
    file_size INTEGER,
    uploaded_at TEXT,
    cdn_url TEXT,

    -- Image dimensions (populated on sync)
    width INTEGER,
    height INTEGER,

    -- Display ordering
    sort_index INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, r2_key),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant
ON gallery_images(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant_date
ON gallery_images(tenant_id, COALESCE(custom_date, parsed_date) DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_images_tenant_category
ON gallery_images(tenant_id, parsed_category);

CREATE INDEX IF NOT EXISTS idx_gallery_images_r2_key
ON gallery_images(tenant_id, r2_key);

CREATE INDEX IF NOT EXISTS idx_gallery_images_sort
ON gallery_images(tenant_id, sort_index DESC);

-- =============================================================================
-- Gallery Tags (multi-tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_tags (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                -- Display name (e.g., "Minecraft", "Food")
    slug TEXT NOT NULL,                -- URL-safe version
    color TEXT DEFAULT '#5cb85f',      -- Hex color for badge
    description TEXT,
    sort_order INTEGER DEFAULT 0,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, slug),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_tenant
ON gallery_tags(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_slug
ON gallery_tags(tenant_id, slug);

-- =============================================================================
-- Gallery Image Tags (many-to-many)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_image_tags (
    image_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES gallery_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_image_tags_image
ON gallery_image_tags(image_id);

CREATE INDEX IF NOT EXISTS idx_gallery_image_tags_tag
ON gallery_image_tags(tag_id);

-- =============================================================================
-- Gallery Collections (curated albums, multi-tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_collections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_id TEXT,               -- Featured cover image
    display_order INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,       -- Whether collection is publicly visible

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, slug),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (cover_image_id) REFERENCES gallery_images(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_collections_tenant
ON gallery_collections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_gallery_collections_slug
ON gallery_collections(tenant_id, slug);

-- =============================================================================
-- Gallery Collection Images (many-to-many)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_collection_images (
    collection_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES gallery_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES gallery_images(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_collection_images_collection
ON gallery_collection_images(collection_id);

CREATE INDEX IF NOT EXISTS idx_gallery_collection_images_image
ON gallery_collection_images(image_id);

-- =============================================================================
-- Comments
-- =============================================================================

-- Note: This migration creates the schema for the Gallery Curio feature.
--
-- Key design decisions:
-- 1. Hybrid R2 + D1 architecture: Images stored in R2, metadata in D1
-- 2. Filename parsing extracts date/category/slug automatically
-- 3. Custom metadata can override parsed values
-- 4. Tags and collections support multi-tenant isolation
-- 5. All tables cascade delete when tenant is removed
-- 6. Indexes optimized for common query patterns (tenant + date, tenant + category)
--
-- Filename pattern: YYYY-MM-DD_slug.ext or category/YYYY-MM-DD_slug.ext
-- CDN URL format: {cdn_base_url}/{r2_key}
-- Supported extensions: .jpg, .jpeg, .png, .gif, .webp, .avif
