-- Guestbook Enhancement: Wall Backings, Signing Styles, Color Palettes
-- Adds personality layers to the guestbook curio.
-- All columns use defaults or NULL so no data migration is needed.

-- Config: room layer (owner picks)
ALTER TABLE guestbook_config ADD COLUMN wall_backing TEXT DEFAULT 'none';
ALTER TABLE guestbook_config ADD COLUMN cta_style TEXT DEFAULT 'button';
ALTER TABLE guestbook_config ADD COLUMN allowed_styles TEXT DEFAULT NULL;
ALTER TABLE guestbook_config ADD COLUMN color_palette TEXT DEFAULT NULL;
ALTER TABLE guestbook_config ADD COLUMN inline_mode TEXT DEFAULT 'compact';

-- Entries: pen layer (visitor picks)
ALTER TABLE guestbook_entries ADD COLUMN entry_style TEXT DEFAULT NULL;
ALTER TABLE guestbook_entries ADD COLUMN entry_color TEXT DEFAULT NULL;
