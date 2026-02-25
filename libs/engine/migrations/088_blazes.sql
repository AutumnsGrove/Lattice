-- ============================================================================
-- 088: Blazes — Content Markers
-- ============================================================================
-- Adds the blaze system: a definitions table for global and tenant-scoped
-- blaze types, plus a blaze column on both posts and meadow_posts.
--
-- Auto-blazes (Bloom/Note) are derived from post_type in code and are NOT
-- stored here. This table holds custom blaze definitions only.
-- ============================================================================

-- Blaze definitions: global defaults (tenant_id NULL) + tenant custom
CREATE TABLE IF NOT EXISTS blaze_definitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blaze_definitions_tenant
  ON blaze_definitions(tenant_id);

-- Add optional custom blaze to garden posts (Slot 2)
ALTER TABLE posts ADD COLUMN blaze TEXT;

-- Add optional custom blaze to meadow posts (Slot 2)
ALTER TABLE meadow_posts ADD COLUMN blaze TEXT;

-- Index for blaze-filtered queries (future feature)
CREATE INDEX IF NOT EXISTS idx_posts_blaze
  ON posts(blaze) WHERE blaze IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meadow_posts_blaze
  ON meadow_posts(blaze) WHERE blaze IS NOT NULL;

-- Seed global default blazes
INSERT INTO blaze_definitions (id, tenant_id, slug, label, icon, color, sort_order) VALUES
  ('blaze-update',       NULL, 'update',       'Update',       'Bell',              'sky',    1),
  ('blaze-food-review',  NULL, 'food-review',  'Food Review',  'UtensilsCrossed',   'rose',   2),
  ('blaze-personal',     NULL, 'personal',     'Personal',     'Heart',             'pink',   3),
  ('blaze-tutorial',     NULL, 'tutorial',     'Tutorial',     'GraduationCap',     'violet', 4),
  ('blaze-project',      NULL, 'project',      'Project',      'Hammer',            'amber',  5),
  ('blaze-review',       NULL, 'review',       'Review',       'Star',              'yellow', 6),
  ('blaze-thought',      NULL, 'thought',      'Thought',      'CloudSun',          'slate',  7),
  ('blaze-announcement', NULL, 'announcement', 'Announcement', 'Megaphone',         'grove',  8);
