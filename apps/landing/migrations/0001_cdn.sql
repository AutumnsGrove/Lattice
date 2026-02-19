-- CDN Files Table
-- Tracks uploaded files to the CDN (R2 bucket)

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Magic codes for passwordless login
CREATE TABLE IF NOT EXISTS magic_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_codes_email ON magic_codes(email);
CREATE INDEX IF NOT EXISTS idx_magic_codes_code ON magic_codes(code);

-- CDN Files table
CREATE TABLE IF NOT EXISTS cdn_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,  -- R2 object key (path in bucket)
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    folder TEXT DEFAULT '/',   -- Virtual folder for organization
    alt_text TEXT,             -- Accessibility alt text
    uploaded_by TEXT NOT NULL, -- User ID who uploaded
    created_at TEXT NOT NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Index for listing files by folder
CREATE INDEX IF NOT EXISTS idx_cdn_files_folder ON cdn_files(folder, created_at DESC);

-- Index for finding files by key
CREATE INDEX IF NOT EXISTS idx_cdn_files_key ON cdn_files(key);

-- Index for finding files by uploader
CREATE INDEX IF NOT EXISTS idx_cdn_files_uploaded_by ON cdn_files(uploaded_by);
