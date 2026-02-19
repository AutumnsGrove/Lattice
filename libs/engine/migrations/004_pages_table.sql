-- Migration: Create pages table for site page content
-- Database: autumnsgrove-posts
-- Run with: npx wrangler d1 execute autumnsgrove-posts --file=migrations/004_pages_table.sql --remote

-- Table for storing site pages (Home, About, Contact, etc.)
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'page',
  markdown_content TEXT NOT NULL,
  html_content TEXT,
  hero TEXT,                      -- JSON object for hero section
  gutter_content TEXT DEFAULT '[]', -- JSON array for gutter items
  font TEXT DEFAULT 'default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by type
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);

-- Index for ordering by update time
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);
