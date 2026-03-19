-- User preferences: theme, grove mode, season
-- These follow the user across all grove domains via session validation.
-- NULL = use default (system theme, grove mode off, summer season).

ALTER TABLE users ADD COLUMN theme TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN grove_mode INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN season TEXT DEFAULT NULL;
