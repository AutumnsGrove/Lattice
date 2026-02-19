-- Curio: Ambient Sounds
-- Optional background audio for immersive experience

CREATE TABLE IF NOT EXISTS ambient_config (
  tenant_id TEXT PRIMARY KEY,
  sound_set TEXT NOT NULL DEFAULT 'forest-rain',
  volume INTEGER NOT NULL DEFAULT 30,
  enabled INTEGER NOT NULL DEFAULT 0,
  custom_url TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
