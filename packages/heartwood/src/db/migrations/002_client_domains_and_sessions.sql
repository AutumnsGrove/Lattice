-- Migration 002: Client domains and user sessions
-- Adds domain tracking for clients and session management for multi-domain redirects

-- Add domain column to clients table
ALTER TABLE clients ADD COLUMN domain TEXT;

-- Add is_admin flag to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- User sessions for tracking user-client associations
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    session_token_hash TEXT UNIQUE NOT NULL,
    last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User's last-used client preference
CREATE TABLE IF NOT EXISTS user_client_preferences (
    user_id TEXT PRIMARY KEY,
    last_used_client_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_client ON user_sessions(client_id);

-- Set domains for existing clients
UPDATE clients SET domain = 'grove.place' WHERE client_id = 'groveengine';
UPDATE clients SET domain = 'autumnsgrove.com' WHERE client_id = 'autumnsgrove';

-- Add admin emails to allowed_emails if not exists
INSERT OR IGNORE INTO allowed_emails (email, added_at, added_by)
VALUES ('autumn@grove.place', datetime('now'), 'migration');

-- Mark admin users
UPDATE users SET is_admin = 1 WHERE email IN ('autumn@grove.place', 'autumnbrown23@pm.me');
