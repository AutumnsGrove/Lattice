-- CDN Files Storage Metadata
-- Tracks files uploaded to the grove-cdn R2 bucket

CREATE TABLE IF NOT EXISTS cdn_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,              -- Clean filename (e.g., "logo-abc123.svg")
    original_filename TEXT NOT NULL,     -- User's original filename
    key TEXT NOT NULL UNIQUE,            -- R2 object key (e.g., "assets/logo-abc123.svg")
    content_type TEXT NOT NULL,          -- MIME type
    size_bytes INTEGER NOT NULL,         -- File size in bytes
    folder TEXT NOT NULL DEFAULT '/',    -- Folder path (e.g., "/", "/assets", "/images")
    alt_text TEXT,                       -- Alt text for images
    uploaded_by TEXT NOT NULL,           -- User ID from groveauth.users
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for quick lookups by folder
CREATE INDEX IF NOT EXISTS idx_cdn_files_folder ON cdn_files(folder);

-- Index for quick lookups by uploader
CREATE INDEX IF NOT EXISTS idx_cdn_files_uploaded_by ON cdn_files(uploaded_by);

-- Index for quick lookups by creation date
CREATE INDEX IF NOT EXISTS idx_cdn_files_created_at ON cdn_files(created_at DESC);
