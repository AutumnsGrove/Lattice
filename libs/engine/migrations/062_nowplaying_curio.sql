-- Now Playing Curio
-- Display what you're currently listening to — Spotify, Last.fm, or manual.
-- The digital equivalent of music playing in a cozy shop.

CREATE TABLE IF NOT EXISTS nowplaying_config (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'manual',
  access_token_encrypted TEXT DEFAULT NULL,
  refresh_token_encrypted TEXT DEFAULT NULL,
  display_style TEXT NOT NULL DEFAULT 'compact',
  show_album_art INTEGER NOT NULL DEFAULT 1,
  show_progress INTEGER NOT NULL DEFAULT 0,
  fallback_text TEXT DEFAULT NULL,
  last_fm_username TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nowplaying_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT DEFAULT NULL,
  album_art_url TEXT DEFAULT NULL,
  played_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nowplaying_history_tenant
  ON nowplaying_history(tenant_id, played_at);
