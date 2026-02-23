-- Gallery Performance: Thumbnails + Dominant Color Placeholders
-- Adds support for pre-generated thumbnails and instant placeholder backgrounds.
-- Existing images gracefully fall back to full-res URLs (no regression).

ALTER TABLE gallery_images ADD COLUMN thumbnail_r2_key TEXT DEFAULT NULL;
ALTER TABLE gallery_images ADD COLUMN dominant_color TEXT DEFAULT NULL;
ALTER TABLE gallery_images ADD COLUMN aspect_ratio REAL DEFAULT NULL;
