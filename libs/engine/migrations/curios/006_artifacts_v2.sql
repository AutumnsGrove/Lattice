-- ============================================================================
-- Migration 006: Artifacts v2 — Zone placement, discovery, reveal animations
-- ============================================================================
-- Expands the artifacts table from the v1 schema (8 types, 3 placements)
-- to the v2 system (20 types, 6 zones, discovery mechanics, containers).
--
-- Backward-compatible: old placement values map to new zones.

-- Add new columns to artifacts table
ALTER TABLE artifacts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'always';
ALTER TABLE artifacts ADD COLUMN discovery_rules TEXT NOT NULL DEFAULT '[]';
ALTER TABLE artifacts ADD COLUMN reveal_animation TEXT NOT NULL DEFAULT 'fade';
ALTER TABLE artifacts ADD COLUMN container TEXT NOT NULL DEFAULT 'none';
ALTER TABLE artifacts ADD COLUMN position_x REAL;
ALTER TABLE artifacts ADD COLUMN position_y REAL;
ALTER TABLE artifacts ADD COLUMN z_index INTEGER NOT NULL DEFAULT 10;
ALTER TABLE artifacts ADD COLUMN fallback_zone TEXT NOT NULL DEFAULT 'floating';

-- Migrate old placement values to new zone system
UPDATE artifacts SET placement = 'sidebar' WHERE placement = 'right-vine';
UPDATE artifacts SET placement = 'sidebar' WHERE placement = 'left-vine';
-- 'floating' remains 'floating' — no change needed

-- Wishing well shared counter table
CREATE TABLE IF NOT EXISTS wishing_well_counts (
  tenant_id TEXT PRIMARY KEY,
  wish_count INTEGER NOT NULL DEFAULT 0
);

-- Glass Cathedral panels table
CREATE TABLE IF NOT EXISTS cathedral_panels (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  panel_order INTEGER NOT NULL,
  background_color TEXT,
  background_image_url TEXT,
  text_content TEXT,
  text_color TEXT,
  link_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cathedral_panels_artifact ON cathedral_panels(artifact_id);
CREATE INDEX IF NOT EXISTS idx_cathedral_panels_tenant ON cathedral_panels(tenant_id);
