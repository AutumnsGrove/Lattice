-- Device authorization codes (RFC 8628)
-- Used for CLI/device authentication flow where users approve access via browser

CREATE TABLE IF NOT EXISTS device_codes (
    id TEXT PRIMARY KEY,
    device_code_hash TEXT UNIQUE NOT NULL,   -- SHA-256 hash for security (device code is a secret)
    user_code TEXT UNIQUE NOT NULL,           -- Human-readable code (plaintext for user lookup)
    client_id TEXT NOT NULL,
    scope TEXT,                               -- Requested OAuth scopes
    status TEXT DEFAULT 'pending',            -- pending, authorized, denied, expired
    user_id TEXT,                             -- NULL until user authorizes
    poll_count INTEGER DEFAULT 0,             -- Track polling for rate limiting
    last_poll_at INTEGER,                     -- Unix timestamp for slow_down detection
    interval INTEGER DEFAULT 5,               -- Required poll interval in seconds
    expires_at INTEGER NOT NULL,              -- Unix timestamp for expiration
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for user code lookup (primary lookup during authorization)
CREATE INDEX IF NOT EXISTS idx_device_codes_user_code ON device_codes(user_code);

-- Index for device code hash lookup (primary lookup during polling)
CREATE INDEX IF NOT EXISTS idx_device_codes_hash ON device_codes(device_code_hash);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_device_codes_expires ON device_codes(expires_at);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_device_codes_status ON device_codes(status);
